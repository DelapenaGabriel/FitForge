package com.fitforge.controller;

import com.fitforge.dto.PostDto;
import com.fitforge.service.PostService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups/{groupId}/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @PostMapping
    public ResponseEntity<PostDto.PostResponse> createPost(
            @PathVariable Long groupId, @RequestBody PostDto.PostRequest req,
            Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(postService.createPost(groupId, req, userId));
    }

    @GetMapping
    public ResponseEntity<List<PostDto.PostResponse>> getPosts(@PathVariable Long groupId) {
        return ResponseEntity.ok(postService.getPosts(groupId));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<PostDto.PostResponse> updatePost(
            @PathVariable Long groupId,
            @PathVariable Long postId,
            @RequestBody PostDto.PostRequest req, Authentication auth) {
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

    @PostMapping("/{postId}/comments")
    public ResponseEntity<PostDto.CommentResponse> addComment(
            @PathVariable Long groupId, @PathVariable Long postId,
            @RequestBody PostDto.CommentRequest req, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(postService.addComment(postId, req, userId));
    }

    @DeleteMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long groupId, @PathVariable Long postId,
            @PathVariable Long commentId, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        postService.deleteComment(commentId, userId);
        return ResponseEntity.noContent().build();
    }
}
