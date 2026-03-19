package com.fitforge.service;

import com.fitforge.dao.CoachPostDao;
import com.fitforge.dao.GroupMemberDao;
import com.fitforge.dao.UserDao;
import com.fitforge.dto.CoachDto;
import com.fitforge.model.CoachPost;
import com.fitforge.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class CoachPostService {

    private final CoachPostDao postDao;
    private final GroupMemberDao memberDao;
    private final UserDao userDao;

    public CoachPostService(CoachPostDao postDao, GroupMemberDao memberDao, UserDao userDao) {
        this.postDao = postDao;
        this.memberDao = memberDao;
        this.userDao = userDao;
    }

    public CoachDto.PostResponse createPost(Long groupId, CoachDto.PostRequest req, Long userId) {
        requireCoach(groupId, userId);

        CoachPost post = CoachPost.builder()
                .groupId(groupId)
                .authorId(userId)
                .content(req.getContent())
                .postType(req.getPostType() != null ? req.getPostType() : "ADVICE")
                .build();
        post = postDao.create(post);
        return toResponse(post);
    }

    public List<CoachDto.PostResponse> getPosts(Long groupId) {
        return postDao.findByGroupId(groupId).stream()
                .map(this::toResponse).toList();
    }

    public CoachDto.PostResponse updatePost(Long postId, Long groupId, CoachDto.PostRequest req, Long userId) {
        requireCoach(groupId, userId);
        CoachPost post = postDao.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!post.getGroupId().equals(groupId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Post does not belong to this group");
        }
        if (!post.getAuthorId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        post.setContent(req.getContent());
        post.setPostType(req.getPostType() != null ? req.getPostType() : "ADVICE");
        
        int rows = postDao.update(post);
        if (rows == 0) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update post");
        }
        
        return toResponse(post);
    }

    public void deletePost(Long postId, Long groupId, Long userId) {
        requireCoach(groupId, userId);
        CoachPost post = postDao.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!post.getAuthorId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        postDao.delete(postId);
    }

    private void requireCoach(Long groupId, Long userId) {
        memberDao.findByGroupAndUser(groupId, userId)
                .filter(m -> "COACH".equals(m.getRole()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Coach role required"));
    }

    private CoachDto.PostResponse toResponse(CoachPost post) {
        User author = userDao.findById(post.getAuthorId()).orElse(null);
        return CoachDto.PostResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorName(author != null ? author.getDisplayName() : "Unknown")
                .authorAvatar(author != null ? author.getAvatarUrl() : null)
                .content(post.getContent())
                .postType(post.getPostType())
                .createdAt(post.getCreatedAt())
                .build();
    }
}
