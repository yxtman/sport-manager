package com.sport.api.social;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "shared_sport_record")
public class SharedSportRecord {

	@Id
	@Column(length = 80)
	private String id;

	@Column(nullable = false)
	private Long userId;

	@Column(nullable = false, length = 30)
	private String type;

	@Column(length = 30)
	private String runSubtype;

	private Integer durationMin;

	private Double distanceKm;

	private Integer calories;

	private Integer perceivedEffort;

	private Integer avgHr;

	private Integer maxHr;

	private Integer paceSecPerKm;

	@Column(nullable = false)
	private Instant startAt;

	@Column(length = 300)
	private String note;

	@Lob
	@Column(columnDefinition = "LONGTEXT")
	private String checkInImage;

	@Column(nullable = false, length = 20)
	private String visibility = "friends";

	@Column(nullable = false)
	private Instant updatedAt = Instant.now();

	public String getId() { return id; }
	public void setId(String id) { this.id = id; }
	public Long getUserId() { return userId; }
	public void setUserId(Long userId) { this.userId = userId; }
	public String getType() { return type; }
	public void setType(String type) { this.type = type; }
	public String getRunSubtype() { return runSubtype; }
	public void setRunSubtype(String runSubtype) { this.runSubtype = runSubtype; }
	public Integer getDurationMin() { return durationMin; }
	public void setDurationMin(Integer durationMin) { this.durationMin = durationMin; }
	public Double getDistanceKm() { return distanceKm; }
	public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }
	public Integer getCalories() { return calories; }
	public void setCalories(Integer calories) { this.calories = calories; }
	public Integer getPerceivedEffort() { return perceivedEffort; }
	public void setPerceivedEffort(Integer perceivedEffort) { this.perceivedEffort = perceivedEffort; }
	public Integer getAvgHr() { return avgHr; }
	public void setAvgHr(Integer avgHr) { this.avgHr = avgHr; }
	public Integer getMaxHr() { return maxHr; }
	public void setMaxHr(Integer maxHr) { this.maxHr = maxHr; }
	public Integer getPaceSecPerKm() { return paceSecPerKm; }
	public void setPaceSecPerKm(Integer paceSecPerKm) { this.paceSecPerKm = paceSecPerKm; }
	public Instant getStartAt() { return startAt; }
	public void setStartAt(Instant startAt) { this.startAt = startAt; }
	public String getNote() { return note; }
	public void setNote(String note) { this.note = note; }
	public String getCheckInImage() { return checkInImage; }
	public void setCheckInImage(String checkInImage) { this.checkInImage = checkInImage; }
	public String getVisibility() { return visibility; }
	public void setVisibility(String visibility) { this.visibility = visibility; }
	public Instant getUpdatedAt() { return updatedAt; }
	public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
