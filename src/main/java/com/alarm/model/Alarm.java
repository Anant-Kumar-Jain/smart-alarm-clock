package com.alarm.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
public class Alarm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String time; // format "HH:mm"
    
    @ElementCollection
    private List<String> days; // e.g., ["MON", "TUE"]
    
    private String audioMode; // "buzzer", "nature", "digital"
    
    private Integer snoozeLength; // in minutes
    
    private Boolean isMathPuzzleRequired;
    
    private Boolean isActive;
    
    private String customAudioUrl;

    public Alarm() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public List<String> getDays() { return days; }
    public void setDays(List<String> days) { this.days = days; }

    public String getAudioMode() { return audioMode; }
    public void setAudioMode(String audioMode) { this.audioMode = audioMode; }

    public Integer getSnoozeLength() { return snoozeLength; }
    public void setSnoozeLength(Integer snoozeLength) { this.snoozeLength = snoozeLength; }

    public Boolean getMathPuzzleRequired() { return isMathPuzzleRequired; }
    public void setMathPuzzleRequired(Boolean mathPuzzleRequired) { isMathPuzzleRequired = mathPuzzleRequired; }

    public Boolean getActive() { return isActive; }
    public void setActive(Boolean active) { isActive = active; }

    public String getCustomAudioUrl() { return customAudioUrl; }
    public void setCustomAudioUrl(String customAudioUrl) { this.customAudioUrl = customAudioUrl; }
}
