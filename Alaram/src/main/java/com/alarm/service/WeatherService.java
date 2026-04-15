package com.alarm.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.HashMap;

@Service
public class WeatherService {
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    public Map<String, Object> getCurrentWeather(Double lat, Double lon) {
        // Default to NYC coordinates if none provided
        if (lat == null || lon == null) {
            lat = 40.7128;
            lon = -74.0060;
        }
        String url = String.format("https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=temperature_2m,relative_humidity_2m&timezone=auto", lat, lon);
        try {
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("current")) {
                Map<String, Object> current = (Map<String, Object>) response.get("current");
                Map<String, Object> result = new HashMap<>();
                result.put("temperature", current.get("temperature_2m"));
                result.put("humidity", current.get("relative_humidity_2m"));
                return result;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        // Fallback data
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("temperature", "N/A");
        fallback.put("humidity", "N/A");
        return fallback;
    }
}
