package com.fitforge.controller;

import com.fitforge.dto.LeaderboardDto;
import com.fitforge.service.LeaderboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public ResponseEntity<List<LeaderboardDto.Entry>> getLeaderboard(@PathVariable Long groupId) {
        return ResponseEntity.ok(leaderboardService.getLeaderboard(groupId));
    }
}
