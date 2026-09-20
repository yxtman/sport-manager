package com.sport.api.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
	boolean existsByRequesterIdAndAddresseeId(Long requesterId, Long addresseeId);
	Optional<Friendship> findByRequesterIdAndAddresseeId(Long requesterId, Long addresseeId);

	@Query("select f from Friendship f where (f.requesterId = :userId or f.addresseeId = :userId) and f.status = 'accepted'")
	List<Friendship> findAcceptedByUserId(@Param("userId") Long userId);

	@Query("select f from Friendship f where f.addresseeId = :userId and f.status = 'pending' order by f.createdAt desc")
	List<Friendship> findIncomingPending(@Param("userId") Long userId);

	@Query("select f from Friendship f where f.requesterId = :userId and f.status = 'pending' order by f.createdAt desc")
	List<Friendship> findOutgoingPending(@Param("userId") Long userId);

	@Query("select f from Friendship f where (f.requesterId = :a and f.addresseeId = :b) or (f.requesterId = :b and f.addresseeId = :a)")
	Optional<Friendship> findAnyBetween(@Param("a") Long a, @Param("b") Long b);
}
