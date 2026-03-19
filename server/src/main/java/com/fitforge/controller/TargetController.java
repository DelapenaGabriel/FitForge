package com.fitforge.controller;

import com.fitforge.dto.TargetDto;
import com.fitforge.service.TargetService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/targets")
public class TargetController {

    private final TargetService targetService;

    public TargetController(TargetService targetService) {
        this.targetService = targetService;
    }

    @GetMapping
    public ResponseEntity<List<TargetDto.TargetResponse>> getTargets(
            @PathVariable Long groupId, @RequestParam Long userId) {
        return ResponseEntity.ok(targetService.getTargets(groupId, userId));
    }

    @PutMapping("/{targetId}")
    public ResponseEntity<TargetDto.TargetResponse> updateTarget(
            @PathVariable Long groupId, @PathVariable Long targetId,
            @RequestBody TargetDto.UpdateRequest req, Authentication auth) {
        Long coachId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(targetService.coachUpdateTarget(targetId, req, coachId));
    }
}
