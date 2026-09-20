package com.sport.api.auth;

import com.sport.api.user.AppUser;
import com.sport.api.user.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

	private final AppUserRepository users;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	public AuthService(AppUserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
	}

	public AuthResponse register(RegisterRequest req) {
		String username = trim(req.username(), 64);
		String password = req.password() == null ? "" : req.password();
		if (username.length() < 3 || username.length() > 64) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "用户名长度 3–64");
		}
		if (password.length() < 6) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "密码至少 6 位");
		}
		if (users.existsByUsername(username)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "用户名已存在");
		}
		AppUser u = new AppUser();
		u.setUsername(username);
		u.setPasswordHash(passwordEncoder.encode(password));
		String nick = trim(req.nickname(), 64);
		u.setNickname(nick.isEmpty() ? username : nick);
		users.save(u);
		String token = jwtService.createToken(u.getId(), u.getUsername());
		return new AuthResponse(token, u.getUsername(), u.getNickname());
	}

	public AuthResponse login(LoginRequest req) {
		String username = trim(req.username(), 64);
		AppUser u = users.findByUsername(username)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码错误"));
		if (!passwordEncoder.matches(req.password() == null ? "" : req.password(), u.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户名或密码错误");
		}
		String token = jwtService.createToken(u.getId(), u.getUsername());
		return new AuthResponse(token, u.getUsername(), u.getNickname());
	}

	public UserInfo me(String bearer) {
		AppUser u = requireUser(bearer);
		return toUserInfo(u);
	}

	public UserInfo updateProfile(String bearer, UpdateProfileRequest body) {
		AppUser u = requireUser(bearer);
		String nick = trim(body == null ? null : body.nickname(), 64);
		if (nick.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "昵称不能为空");
		}
		u.setNickname(nick);
		users.save(u);
		return toUserInfo(u);
	}

	public MapResponse changePassword(String bearer, ChangePasswordRequest body) {
		AppUser u = requireUser(bearer);
		String oldPassword = body == null || body.oldPassword() == null ? "" : body.oldPassword();
		String newPassword = body == null || body.newPassword() == null ? "" : body.newPassword();
		if (!passwordEncoder.matches(oldPassword, u.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "原密码不正确");
		}
		if (newPassword.length() < 6) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "新密码至少 6 位");
		}
		u.setPasswordHash(passwordEncoder.encode(newPassword));
		users.save(u);
		return new MapResponse(true, "密码已修改");
	}

	private AppUser requireUser(String bearer) {
		if (bearer == null || !bearer.startsWith("Bearer ")) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "未登录");
		}
		String token = bearer.substring(7).trim();
		var claims = jwtService.parse(token).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "无效或过期的令牌"));
		Long id = Long.parseLong(claims.getSubject());
		return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "用户不存在"));
	}

	private UserInfo toUserInfo(AppUser u) {
		return new UserInfo(u.getId(), u.getUsername(), u.getNickname(), u.getCreatedAt().toString());
	}

	private static String trim(String s, int max) {
		if (s == null) return "";
		String t = s.trim();
		return t.length() > max ? t.substring(0, max) : t;
	}

	public record MapResponse(boolean ok, String message) {}
}
