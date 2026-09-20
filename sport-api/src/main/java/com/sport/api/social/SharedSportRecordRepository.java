package com.sport.api.social;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface SharedSportRecordRepository extends JpaRepository<SharedSportRecord, String> {
	List<SharedSportRecord> findTop80ByUserIdInOrderByStartAtDesc(Collection<Long> userIds);
	List<SharedSportRecord> findByUserIdOrderByStartAtDesc(Long userId);
}
