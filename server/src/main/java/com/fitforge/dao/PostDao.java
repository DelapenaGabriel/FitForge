package com.fitforge.dao;

import com.fitforge.model.Post;
import com.fitforge.model.PostComment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class PostDao {

    private final JdbcTemplate jdbc;

    public PostDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<Post> rowMapper = (rs, rowNum) -> {
        Long id = rs.getLong("id");
        return Post.builder()
            .id(id)
            .groupId(rs.getLong("group_id"))
            .authorId(rs.getLong("author_id"))
            .content(rs.getString("content"))
            .postType(rs.getString("post_type"))
            .photoUrls(fetchMediaForPost(id, "IMAGE"))
            .videoUrls(fetchMediaForPost(id, "VIDEO"))
            .comments(fetchCommentsForPost(id))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .build();
    };

    private List<String> fetchMediaForPost(Long postId, String mediaType) {
        return jdbc.query("SELECT media_url FROM post_media WHERE post_id = ? AND media_type = ?",
                (rs, rowNum) -> rs.getString("media_url"), postId, mediaType);
    }

    private List<PostComment> fetchCommentsForPost(Long postId) {
        return jdbc.query("SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC",
                (rs, rowNum) -> PostComment.builder()
                        .id(rs.getLong("id"))
                        .postId(rs.getLong("post_id"))
                        .authorId(rs.getLong("author_id"))
                        .content(rs.getString("content"))
                        .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                        .build(), postId);
    }

    public Post create(Post post) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO coach_posts (group_id, author_id, content, post_type) VALUES (?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, post.getGroupId());
            ps.setLong(2, post.getAuthorId());
            ps.setString(3, post.getContent());
            ps.setString(4, post.getPostType() != null ? post.getPostType() : "MEMBER_POST");
            return ps;
        }, kh);
        post.setId(((Number) kh.getKeys().get("id")).longValue());
        post.setCreatedAt(java.time.LocalDateTime.now());
        saveMedia(post.getId(), post.getPhotoUrls(), "IMAGE");
        saveMedia(post.getId(), post.getVideoUrls(), "VIDEO");
        return post;
    }

    private void saveMedia(Long postId, List<String> urls, String mediaType) {
        jdbc.update("DELETE FROM post_media WHERE post_id = ? AND media_type = ?", postId, mediaType);
        if (urls != null && !urls.isEmpty()) {
            for (String url : urls) {
                jdbc.update("INSERT INTO post_media (post_id, media_url, media_type) VALUES (?, ?, ?)", postId, url, mediaType);
            }
        }
    }

    public List<Post> findByGroupId(Long groupId) {
        return jdbc.query(
            "SELECT * FROM coach_posts WHERE group_id = ? ORDER BY created_at DESC",
            rowMapper, groupId);
    }

    public Optional<Post> findById(Long id) {
        return jdbc.query("SELECT * FROM coach_posts WHERE id = ?", rowMapper, id)
                .stream().findFirst();
    }

    public int update(Post post) {
        int rows = jdbc.update(
            "UPDATE coach_posts SET content = ?, post_type = ? WHERE id = ?",
            post.getContent(), post.getPostType(), post.getId());
        saveMedia(post.getId(), post.getPhotoUrls(), "IMAGE");
        saveMedia(post.getId(), post.getVideoUrls(), "VIDEO");
        return rows;
    }

    public void delete(Long id) {
        jdbc.update("DELETE FROM coach_posts WHERE id = ?", id);
    }
}
