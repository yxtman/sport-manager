package com.sport.api.social;

import com.sport.api.auth.CurrentUserProvider;
import com.sport.api.user.AppUser;
import com.sport.api.user.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/social")
public class SocialController {

	private final CurrentUserProvider currentUser;
	private final AppUserRepository users;
	private final FriendshipRepository friendships;
	private final UserBlockRepository blocks;
	private final SharedSportRecordRepository records;
	private final SportRecordLikeRepository likes;
	private final SportRecordCommentRepository comments;

	public SocialController(CurrentUserProvider currentUser, AppUserRepository users, FriendshipRepository friendships,
			UserBlockRepository blocks, SharedSportRecordRepository records, SportRecordLikeRepository likes, SportRecordCommentRepository comments) {
		this.currentUser = currentUser;
		this.users = users;
		this.friendships = friendships;
		this.blocks = blocks;
		this.records = records;
		this.likes = likes;
		this.comments = comments;
	}

	@GetMapping("/users/search")
	public List<UserDto> searchUsers(@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestParam(defaultValue = "") String keyword) {
		Long me = currentUser.requireUserId(authorization);
		String q = keyword == null ? "" : keyword.trim();
		if (q.length() < 1) return List.of();
		return users.findAll().stream()
				.filter(u -> !u.getId().equals(me))
				.filter(u -> !isBlockedEitherWay(me, u.getId()))
				.filter(u -> contains(u.getUsername(), q) || contains(u.getNickname(), q))
				.limit(20)
				.map(this::toUserDto)
				.toList();
	}

	@GetMapping("/friends")
	public List<UserDto> friends(@RequestHeader(value = "Authorization", required = false) String authorization) {
		Long me = currentUser.requireUserId(authorization);
		return getFriendIds(me).stream()
				.map(id -> users.findById(id).orElse(null))
				.filter(u -> u != null)
				.map(this::toUserDto)
				.toList();
	}

	@DeleteMapping("/friends/{friendId}")
	public Map<String, Object> removeFriend(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable Long friendId) {
		Long me = currentUser.requireUserId(authorization);
		if (me.equals(friendId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不能删除自己");
		Friendship f = friendships.findAnyBetween(me, friendId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "你们不是好友"));
		if (!"accepted".equals(f.getStatus())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "你们还不是好友");
		}
		friendships.delete(f);
		return Map.of("ok", true, "message", "已删除好友");
	}

	@PostMapping("/friends/{friendId}")
	public Map<String, Object> sendFriendRequest(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable Long friendId) {
		Long me = currentUser.requireUserId(authorization);
		if (me.equals(friendId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不能添加自己");
		if (isBlockedEitherWay(me, friendId)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无法向该用户发送申请");
		}
		users.findById(friendId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));

		Friendship existing = friendships.findAnyBetween(me, friendId).orElse(null);
		if (existing != null) {
			if ("accepted".equals(existing.getStatus())) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "你们已经是好友了");
			}
			if ("pending".equals(existing.getStatus())) {
				if (existing.getRequesterId().equals(me)) {
					throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "好友申请已发送，请等待对方同意");
				}
				existing.setStatus("accepted");
				friendships.save(existing);
				return Map.of("ok", true, "accepted", true, "message", "对方也向你发起了申请，已自动成为好友");
			}
		}

		Friendship f = new Friendship();
		f.setRequesterId(me);
		f.setAddresseeId(friendId);
		f.setStatus("pending");
		f.setCreatedAt(Instant.now());
		friendships.save(f);
		return Map.of("ok", true, "accepted", false, "message", "好友申请已发送");
	}

	@GetMapping("/friend-requests/incoming")
	public List<FriendRequestDto> incomingFriendRequests(
			@RequestHeader(value = "Authorization", required = false) String authorization) {
		Long me = currentUser.requireUserId(authorization);
		return friendships.findIncomingPending(me).stream().map(this::toIncomingRequestDto).toList();
	}

	@GetMapping("/friend-requests/outgoing")
	public List<FriendRequestDto> outgoingFriendRequests(
			@RequestHeader(value = "Authorization", required = false) String authorization) {
		Long me = currentUser.requireUserId(authorization);
		return friendships.findOutgoingPending(me).stream().map(this::toOutgoingRequestDto).toList();
	}

	@PostMapping("/friend-requests/{requestId}/accept")
	public Map<String, Object> acceptFriendRequest(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable Long requestId) {
		Long me = currentUser.requireUserId(authorization);
		Friendship f = friendships.findById(requestId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "申请不存在"));
		if (!f.getAddresseeId().equals(me)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只能处理发给你的好友申请");
		}
		if (!"pending".equals(f.getStatus())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "该申请已处理");
		}
		f.setStatus("accepted");
		friendships.save(f);
		return Map.of("ok", true);
	}

	@PostMapping("/friend-requests/{requestId}/reject")
	public Map<String, Object> rejectFriendRequest(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable Long requestId) {
		Long me = currentUser.requireUserId(authorization);
		Friendship f = friendships.findById(requestId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "申请不存在"));
		if (!f.getAddresseeId().equals(me)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只能处理发给你的好友申请");
		}
		if (!"pending".equals(f.getStatus())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "该申请已处理");
		}
		friendships.delete(f);
		return Map.of("ok", true);
	}

	@GetMapping("/blocks")
	public List<UserDto> listBlockedUsers(@RequestHeader(value = "Authorization", required = false) String authorization) {
		Long me = currentUser.requireUserId(authorization);
		return blocks.findByBlockerIdOrderByCreatedAtDesc(me).stream()
				.map(b -> users.findById(b.getBlockedId()).orElse(null))
				.filter(u -> u != null)
				.map(this::toUserDto)
				.toList();
	}

	@PostMapping("/blocks/{userId}")
	public Map<String, Object> blockUser(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable Long userId) {
		Long me = currentUser.requireUserId(authorization);
		if (me.equals(userId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不能拉黑自己");
		users.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
		friendships.findAnyBetween(me, userId).ifPresent(friendships::delete);
		if (blocks.findByBlockerIdAndBlockedId(me, userId).isEmpty()) {
			UserBlock b = new UserBlock();
			b.setBlockerId(me);
			b.setBlockedId(userId);
			blocks.save(b);
		}
		return Map.of("ok", true, "message", "已拉黑");
	}

	@DeleteMapping("/blocks/{userId}")
	public Map<String, Object> unblockUser(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable Long userId) {
		Long me = currentUser.requireUserId(authorization);
		blocks.deleteByBlockerIdAndBlockedId(me, userId);
		return Map.of("ok", true, "message", "已取消拉黑");
	}

	@PostMapping("/records")
	public Map<String, Object> upsertRecord(@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody SharedRecordRequest body) {
		Long me = currentUser.requireUserId(authorization);
		String id = trim(body.id(), 80);
		if (id.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "记录 id 不能为空");
		SharedSportRecord r = records.findById(id).orElseGet(SharedSportRecord::new);
		if (r.getId() != null && !r.getUserId().equals(me)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权修改该记录");
		}
		r.setId(id);
		r.setUserId(me);
		r.setType(nonEmpty(body.type(), "跑步", 30));
		r.setRunSubtype(trim(body.runSubtype(), 30));
		r.setDurationMin(toInteger(body.durationMin()));
		r.setDistanceKm(toDouble(body.distanceKm()));
		r.setCalories(toInteger(body.calories()));
		r.setPerceivedEffort(toInteger(body.perceivedEffort()));
		r.setAvgHr(toInteger(body.avgHr()));
		r.setMaxHr(toInteger(body.maxHr()));
		r.setPaceSecPerKm(toInteger(body.paceSecPerKm()));
		r.setStartAt(parseInstant(body.startAt()));
		r.setNote(trim(body.note(), 300));
		r.setCheckInImage(trim(body.checkInImage(), 2_500_000));
		r.setVisibility(nonEmpty(body.visibility(), "friends", 20));
		r.setUpdatedAt(Instant.now());
		records.save(r);
		return Map.of("ok", true);
	}

	@DeleteMapping("/records/{recordId}")
	public Map<String, Object> deleteRecord(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable String recordId) {
		Long me = currentUser.requireUserId(authorization);
		SharedSportRecord r = records.findById(recordId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在"));
		if (!r.getUserId().equals(me)) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无权删除该记录");
		}
		deleteRecordCascade(recordId);
		return Map.of("ok", true);
	}

	@PostMapping("/records/prune")
	public Map<String, Object> pruneRecords(@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody(required = false) PruneRequest body) {
		Long me = currentUser.requireUserId(authorization);
		Set<String> keepIds = new HashSet<>();
		if (body != null && body.keepIds() != null) {
			body.keepIds().stream().map(id -> trim(id, 80)).filter(id -> !id.isEmpty()).forEach(keepIds::add);
		}
		int removed = 0;
		for (SharedSportRecord r : records.findByUserIdOrderByStartAtDesc(me)) {
			if (!keepIds.contains(r.getId())) {
				deleteRecordCascade(r.getId());
				removed++;
			}
		}
		return Map.of("ok", true, "removed", removed);
	}

	@GetMapping("/feed")
	public List<FeedItemDto> feed(@RequestHeader(value = "Authorization", required = false) String authorization) {
		Long me = currentUser.requireUserId(authorization);
		Set<Long> ids = getFriendIds(me);
		ids.add(me);
		List<SharedSportRecord> list = records.findTop80ByUserIdInOrderByStartAtDesc(ids).stream()
				.filter(r -> !isBlockedEitherWay(me, r.getUserId()))
				.toList();
		return buildFeed(me, list);
	}

	@PostMapping("/records/{recordId}/like")
	public Map<String, Object> toggleLike(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable String recordId) {
		Long me = currentUser.requireUserId(authorization);
		SharedSportRecord r = records.findById(recordId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在"));
		assertCanView(me, r);
		if (likes.existsByRecordIdAndUserId(recordId, me)) {
			likes.deleteByRecordIdAndUserId(recordId, me);
			return Map.of("liked", false, "likeCount", likes.countByRecordId(recordId));
		}
		SportRecordLike like = new SportRecordLike();
		like.setRecordId(recordId);
		like.setUserId(me);
		likes.save(like);
		return Map.of("liked", true, "likeCount", likes.countByRecordId(recordId));
	}

	@GetMapping("/records/{recordId}/comments")
	public List<CommentDto> listComments(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable String recordId) {
		Long me = currentUser.requireUserId(authorization);
		SharedSportRecord r = records.findById(recordId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在"));
		assertCanView(me, r);
		return comments.findTop50ByRecordIdOrderByCreatedAtAsc(recordId).stream().map(this::toCommentDto).toList();
	}

	@PostMapping("/records/{recordId}/comments")
	public CommentDto addComment(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable String recordId, @RequestBody CommentRequest body) {
		Long me = currentUser.requireUserId(authorization);
		SharedSportRecord r = records.findById(recordId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "记录不存在"));
		assertCanView(me, r);
		String content = trim(body.content(), 300);
		if (content.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "评论不能为空");
		SportRecordComment c = new SportRecordComment();
		c.setRecordId(recordId);
		c.setUserId(me);
		c.setContent(content);
		comments.save(c);
		return toCommentDto(c);
	}

	private List<FeedItemDto> buildFeed(Long me, List<SharedSportRecord> list) {
		List<String> recordIds = list.stream().map(SharedSportRecord::getId).toList();
		Map<String, Long> likeCounts = new HashMap<>();
		Map<String, Long> commentCounts = new HashMap<>();
		Set<String> likedByMe = new HashSet<>();
		if (!recordIds.isEmpty()) {
			likes.findByRecordIdIn(recordIds).forEach(l -> {
				likeCounts.put(l.getRecordId(), likeCounts.getOrDefault(l.getRecordId(), 0L) + 1);
				if (l.getUserId().equals(me)) likedByMe.add(l.getRecordId());
			});
			comments.findByRecordIdIn(recordIds).forEach(c -> commentCounts.put(c.getRecordId(), commentCounts.getOrDefault(c.getRecordId(), 0L) + 1));
		}
		return list.stream().map(r -> {
			AppUser u = users.findById(r.getUserId()).orElse(null);
			return toFeedDto(r, u, likeCounts.getOrDefault(r.getId(), 0L), commentCounts.getOrDefault(r.getId(), 0L), likedByMe.contains(r.getId()));
		}).toList();
	}

	private Set<Long> getFriendIds(Long me) {
		return friendships.findAcceptedByUserId(me).stream()
				.map(f -> f.getRequesterId().equals(me) ? f.getAddresseeId() : f.getRequesterId())
				.filter(id -> !isBlockedEitherWay(me, id))
				.collect(Collectors.toCollection(HashSet::new));
	}

	private boolean isBlockedEitherWay(Long a, Long b) {
		return blocks.findAnyBetween(a, b).isPresent();
	}

	private void assertCanView(Long me, SharedSportRecord r) {
		if (r.getUserId().equals(me)) return;
		if (isBlockedEitherWay(me, r.getUserId())) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "无法查看该用户动态");
		}
		if (!getFriendIds(me).contains(r.getUserId())) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "只能查看好友动态");
		}
	}

	private void deleteRecordCascade(String recordId) {
		likes.deleteByRecordId(recordId);
		comments.deleteByRecordId(recordId);
		records.deleteById(recordId);
	}

	private UserDto toUserDto(AppUser u) {
		return new UserDto(u.getId(), u.getUsername(), u.getNickname());
	}

	private FriendRequestDto toIncomingRequestDto(Friendship f) {
		AppUser u = users.findById(f.getRequesterId()).orElse(null);
		return new FriendRequestDto(f.getId(), toUserDtoOrUnknown(f.getRequesterId(), u), f.getCreatedAt().toString(), "incoming");
	}

	private FriendRequestDto toOutgoingRequestDto(Friendship f) {
		AppUser u = users.findById(f.getAddresseeId()).orElse(null);
		return new FriendRequestDto(f.getId(), toUserDtoOrUnknown(f.getAddresseeId(), u), f.getCreatedAt().toString(), "outgoing");
	}

	private FeedItemDto toFeedDto(SharedSportRecord r, AppUser u, long likeCount, long commentCount, boolean likedByMe) {
		UserDto user = u == null ? new UserDto(r.getUserId(), "未知用户", "") : toUserDto(u);
		return new FeedItemDto(r.getId(), user, r.getType(), r.getRunSubtype(), r.getDurationMin(), r.getDistanceKm(), r.getCalories(), r.getStartAt().toString(), r.getNote(), r.getCheckInImage(), likeCount, commentCount, likedByMe);
	}

	private CommentDto toCommentDto(SportRecordComment c) {
		AppUser u = users.findById(c.getUserId()).orElse(null);
		return new CommentDto(c.getId(), toUserDtoOrUnknown(c.getUserId(), u), c.getContent(), c.getCreatedAt().toString());
	}

	private UserDto toUserDtoOrUnknown(Long id, AppUser u) {
		return u == null ? new UserDto(id, "未知用户", "") : toUserDto(u);
	}

	private static boolean contains(String value, String q) {
		return value != null && value.toLowerCase().contains(q.toLowerCase());
	}

	private static String trim(String s, int max) {
		if (s == null) return "";
		String t = s.trim();
		return t.length() > max ? t.substring(0, max) : t;
	}

	private static String nonEmpty(String s, String fallback, int max) {
		String t = trim(s, max);
		return t.isEmpty() ? fallback : t;
	}

	private static Integer toInteger(Number n) {
		return n == null ? null : n.intValue();
	}

	private static Double toDouble(Number n) {
		return n == null ? null : n.doubleValue();
	}

	private static Instant parseInstant(String s) {
		try {
			return s == null || s.isBlank() ? Instant.now() : Instant.parse(s);
		} catch (Exception e) {
			return Instant.now();
		}
	}

	public record UserDto(Long id, String username, String nickname) {}
	public record FriendRequestDto(Long id, UserDto user, String createdAt, String direction) {}
	public record FeedItemDto(String id, UserDto user, String type, String runSubtype, Integer durationMin, Double distanceKm, Integer calories, String startAt, String note, String checkInImage, long likeCount, long commentCount, boolean likedByMe) {}
	public record CommentDto(Long id, UserDto user, String content, String createdAt) {}
	public record CommentRequest(String content) {}
	public record SharedRecordRequest(String id, String type, String runSubtype, Number durationMin, Number distanceKm, Number calories, Number perceivedEffort, Number avgHr, Number maxHr, Number paceSecPerKm, String startAt, String note, String checkInImage, String visibility) {}
	public record PruneRequest(List<String> keepIds) {}
}
