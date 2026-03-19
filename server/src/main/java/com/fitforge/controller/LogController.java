package com.fitforge.controller;

import com.fitforge.dto.LogDto;
import com.fitforge.service.LogService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/logs")
public class LogController {

    private final LogService logService;

    public LogController(LogService logService) {
        this.logService = logService;
    }

    @PostMapping
    public ResponseEntity<LogDto.LogResponse> createLog(
            @PathVariable Long groupId,
            @RequestBody LogDto.CreateRequest req,
            Authentication auth) {

        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(logService.createLog(groupId, userId, req));
    }

    @GetMapping
    public ResponseEntity<List<LogDto.LogResponse>> getLogs(
            @PathVariable Long groupId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(logService.getLogs(groupId, userId));
    }

    @PutMapping("/{logId}")
    public ResponseEntity<LogDto.LogResponse> updateLog(
            @PathVariable Long groupId, @PathVariable Long logId,
            @RequestBody LogDto.CreateRequest req, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(logService.updateLog(logId, userId, req));
    }

    @DeleteMapping("/{logId}")
    public ResponseEntity<Void> deleteLog(
            @PathVariable Long groupId, @PathVariable Long logId, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        logService.deleteLog(logId, userId);
        return ResponseEntity.noContent().build();
    }
}
