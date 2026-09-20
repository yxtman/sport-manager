package com.sport.api.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserBlockRepository extends JpaRepository<UserBlock, Long> {
	Optional<UserBlock> findByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

	List<UserBlock> findByBlockerIdOrderByCreatedAtDesc(Long blockerId);

	@Query("select b from UserBlock b where (b.blockerId = :a and b.blockedId = :b) or (b.blockerId = :b and b.blockedId = :a)")
	Optional<UserBlock> findAnyBetween(@Param("a") Long a, @Param("b") Long b);

	void deleteByBlockerIdAndBlockedId(Long blockerId, Long blockedId);
}
