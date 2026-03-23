package com.fitforge.dao;

import com.fitforge.model.PostComment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

@Repository
public class PostCommentDao {

    private final JdbcTemplate jdbc;

    public PostCommentDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<PostComment> rowMapper = (rs, rowNum) -> PostComment.builder()
            .id(rs.getLong("id"))
            .postId(rs.getLong("post_id"))
            .authorId(rs.getLong("author_id"))
            .content(rs.getString("content"))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .build();

    public PostComment create(PostComment comment) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO post_comments (post_id, author_id, content) VALUES (?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, comment.getPostId());
            ps.setLong(2, comment.getAuthorId());
            ps.setString(3, comment.getContent());
            return ps;
        }, kh);
        comment.setId(((Number) kh.getKeys().get("id")).longValue());
        return comment;
    }

    public List<PostComment> findByPostId(Long postId) {
        return jdbc.query(
            "SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC",
            rowMapper, postId);
    }

    public void delete(Long id) {
        jdbc.update("DELETE FROM post_comments WHERE id = ?", id);
    }
}
