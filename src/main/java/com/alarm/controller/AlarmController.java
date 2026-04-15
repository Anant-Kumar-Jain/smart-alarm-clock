package com.alarm.controller;

import com.alarm.model.Alarm;
import com.alarm.repository.AlarmRepository;
import com.alarm.service.WeatherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.alarm.model.AudioFile;
import com.alarm.repository.AudioFileRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AlarmController {

    @Autowired
    private AlarmRepository alarmRepository;
    
    @Autowired
    private WeatherService weatherService;
    
    @Autowired
    private AudioFileRepository audioFileRepository;

    @GetMapping("/alarms")
    public List<Alarm> getAllAlarms() {
        return alarmRepository.findAll();
    }
    
    @PostMapping("/alarms")
    public Alarm createAlarm(@RequestBody Alarm alarm) {
        return alarmRepository.save(alarm);
    }
    
    @PutMapping("/alarms/{id}")
    public ResponseEntity<Alarm> updateAlarm(@PathVariable Long id, @RequestBody Alarm alarmDetails) {
        return alarmRepository.findById(id).map(alarm -> {
            alarm.setTime(alarmDetails.getTime());
            alarm.setDays(alarmDetails.getDays());
            alarm.setAudioMode(alarmDetails.getAudioMode());
            alarm.setSnoozeLength(alarmDetails.getSnoozeLength());
            alarm.setMathPuzzleRequired(alarmDetails.getMathPuzzleRequired());
            alarm.setActive(alarmDetails.getActive());
            alarm.setCustomAudioUrl(alarmDetails.getCustomAudioUrl());
            return ResponseEntity.ok(alarmRepository.save(alarm));
        }).orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/alarms/{id}")
    public ResponseEntity<?> deleteAlarm(@PathVariable Long id) {
        return alarmRepository.findById(id).map(alarm -> {
            alarmRepository.delete(alarm);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/weather")
    public Map<String, Object> getWeather(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon) {
        return weatherService.getCurrentWeather(lat, lon);
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadAudio(@RequestParam("file") MultipartFile file) {
        try {
            AudioFile audioFile = new AudioFile(
                file.getOriginalFilename(),
                file.getContentType(),
                file.getBytes()
            );
            audioFile = audioFileRepository.save(audioFile);
            
            Map<String, String> response = new HashMap<>();
            response.put("url", "/api/audio/" + audioFile.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/audio/{id}")
    public ResponseEntity<byte[]> getAudio(@PathVariable Long id) {
        return audioFileRepository.findById(id).map(audioFile -> {
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + audioFile.getFileName() + "\"")
                    .contentType(MediaType.parseMediaType(audioFile.getFileType() != null ? audioFile.getFileType() : "audio/mpeg"))
                    .body(audioFile.getData());
        }).orElse(ResponseEntity.notFound().build());
    }
}
