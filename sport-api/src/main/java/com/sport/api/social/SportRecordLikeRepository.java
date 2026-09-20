package com.sport.api.social;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SportRecordLikeRepository extends JpaRepository<SportRecordLike, Long> {
	long countByRecordId(String recordId);
	Optional<SportRecordLike> findByRecordIdAndUserId(String recordId, Long userId);
	boolean existsByRecordIdAndUserId(String recordId, Long userId);
	void deleteByRecordIdAndUserId(String recordId, Long userId);
	void deleteByRecordId(String recordId);
	List<SportRecordLike> findByRecordIdIn(List<String> recordIds);
}
