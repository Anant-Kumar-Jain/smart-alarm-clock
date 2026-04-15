package com.alarm.repository;

import com.alarm.model.AudioFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AudioFileRepository extends JpaRepository<AudioFile, Long> {
}
