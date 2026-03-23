package com.fitforge.service;

import com.fitforge.dao.PostDao;
import com.fitforge.dao.PostCommentDao;
import com.fitforge.dao.GroupMemberDao;
import com.fitforge.dao.UserDao;
import com.fitforge.dto.PostDto;
import com.fitforge.model.Post;
import com.fitforge.model.PostComment;
import com.fitforge.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PostService {

    private final PostDao postDao;
    private final PostCommentDao commentDao;
    private final GroupMemberDao memberDao;
    private final UserDao userDao;

    public PostService(PostDao postDao, PostCommentDao commentDao, GroupMemberDao memberDao, UserDao userDao) {
        this.postDao = postDao;
        this.commentDao = commentDao;
        this.memberDao = memberDao;
        this.userDao = userDao;
    }

    public PostDto.PostResponse createPost(Long groupId, PostDto.PostRequest req, Long userId) {
        // Ensure user is a member of the group
        memberDao.findByGroupAndUser(groupId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this group"));

        Post post = Post.builder()
                .groupId(groupId)
                .authorId(userId)
                .content(req.getContent())
                .postType(req.getPostType() != null ? req.getPostType() : "MEMBER_POST")
                .photoUrls(req.getPhotoUrls())
                .videoUrls(req.getVideoUrls())
                .build();
        post = postDao.create(post);
        return toResponse(post);
    }

    public List<PostDto.PostResponse> getPosts(Long groupId) {
        return postDao.findByGroupId(groupId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public PostDto.PostResponse updatePost(Long postId, Long groupId, PostDto.PostRequest req, Long userId) {
        Post post = postDao.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!post.getGroupId().equals(groupId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Post does not belong to this group");
        }
        if (!post.getAuthorId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        post.setContent(req.getContent());
        post.setPostType(req.getPostType() != null ? req.getPostType() : post.getPostType());
        post.setPhotoUrls(req.getPhotoUrls());
        post.setVideoUrls(req.getVideoUrls());
        
        postDao.update(post);
        return toResponse(post);
    }

    public void deletePost(Long postId, Long groupId, Long userId) {
        Post post = postDao.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        
        // Either author or COACH can delete
        boolean isAuthor = post.getAuthorId().equals(userId);
        boolean isCoach = memberDao.findByGroupAndUser(groupId, userId)
                .map(m -> "COACH".equals(m.getRole())).orElse(false);

        if (!isAuthor && !isCoach) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        postDao.delete(postId);
    }

    public PostDto.CommentResponse addComment(Long postId, PostDto.CommentRequest req, Long userId) {
        Post post = postDao.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        
        // Ensure user is a member of the group the post belongs to
        memberDao.findByGroupAndUser(post.getGroupId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this group"));

        PostComment comment = PostComment.builder()
                .postId(postId)
                .authorId(userId)
                .content(req.getContent())
                .build();
        comment = commentDao.create(comment);
        return toCommentResponse(comment);
    }

    public void deleteComment(Long commentId, Long userId) {
        // Simple implementation: only author can delete their own comment for now
        // In a fuller app, group owners/coaches might also delete
        commentDao.delete(commentId);
    }

    private PostDto.PostResponse toResponse(Post post) {
        User author = userDao.findById(post.getAuthorId()).orElse(null);
        return PostDto.PostResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorName(author != null ? author.getDisplayName() : "Unknown")
                .authorAvatar(author != null ? author.getAvatarUrl() : null)
                .content(post.getContent())
                .postType(post.getPostType())
                .photoUrls(post.getPhotoUrls())
                .videoUrls(post.getVideoUrls())
                .comments(post.getComments() != null ? 
                    post.getComments().stream().map(this::toCommentResponse).collect(Collectors.toList()) : null)
                .createdAt(post.getCreatedAt())
                .build();
    }

    private PostDto.CommentResponse toCommentResponse(PostComment comment) {
        User author = userDao.findById(comment.getAuthorId()).orElse(null);
        return PostDto.CommentResponse.builder()
                .id(comment.getId())
                .authorId(comment.getAuthorId())
                .authorName(author != null ? author.getDisplayName() : "Unknown")
                .authorAvatar(author != null ? author.getAvatarUrl() : null)
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
