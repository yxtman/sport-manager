package com.sport.api.social;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SportRecordCommentRepository extends JpaRepository<SportRecordComment, Long> {
	long countByRecordId(String recordId);
	List<SportRecordComment> findTop50ByRecordIdOrderByCreatedAtAsc(String recordId);
	List<SportRecordComment> findByRecordIdIn(List<String> recordIds);
	void deleteByRecordId(String recordId);
}
