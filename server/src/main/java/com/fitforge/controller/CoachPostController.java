package com.fitforge.controller;

import com.fitforge.dto.CoachDto;
import com.fitforge.service.CoachPostService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/posts")
public class CoachPostController {

    private final CoachPostService postService;

    public CoachPostController(CoachPostService postService) {
        this.postService = postService;
    }

    @PostMapping
    public ResponseEntity<CoachDto.PostResponse> createPost(
            @PathVariable Long groupId, @RequestBody CoachDto.PostRequest req,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(postService.createPost(groupId, req, userId));
    }

    @GetMapping
    public ResponseEntity<List<CoachDto.PostResponse>> getPosts(@PathVariable Long groupId) {
        return ResponseEntity.ok(postService.getPosts(groupId));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<CoachDto.PostResponse> updatePost(
            @PathVariable("groupId") Long groupId,
            @PathVariable("postId") Long postId,
            @RequestBody CoachDto.PostRequest req, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(postService.updatePost(postId, groupId, req, userId));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long groupId, @PathVariable Long postId, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        postService.deletePost(postId, groupId, userId);
        return ResponseEntity.noContent().build();
    }
}
