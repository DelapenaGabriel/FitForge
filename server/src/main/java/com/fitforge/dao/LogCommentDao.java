package com.fitforge.dao;

import com.fitforge.model.LogComment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

@Repository
public class LogCommentDao {

    private final JdbcTemplate jdbc;

    public LogCommentDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<LogComment> rowMapper = (rs, rowNum) -> LogComment.builder()
            .id(rs.getLong("id"))
            .logId(rs.getLong("log_id"))
            .authorId(rs.getLong("author_id"))
            .content(rs.getString("content"))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .build();

    public LogComment create(LogComment comment) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO log_comments (log_id, author_id, content) VALUES (?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, comment.getLogId());
            ps.setLong(2, comment.getAuthorId());
            ps.setString(3, comment.getContent());
            return ps;
        }, kh);
        comment.setId(((Number) kh.getKeys().get("id")).longValue());
        return comment;
    }

    public List<LogComment> findByLogId(Long logId) {
        return jdbc.query(
            "SELECT * FROM log_comments WHERE log_id = ? ORDER BY created_at ASC",
            rowMapper, logId);
    }

    public void delete(Long id) {
        jdbc.update("DELETE FROM log_comments WHERE id = ?", id);
    }
}
