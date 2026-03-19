package com.fitforge.dao;

import com.fitforge.model.CoachPost;
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
public class CoachPostDao {

    private final JdbcTemplate jdbc;

    public CoachPostDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<CoachPost> rowMapper = (rs, rowNum) -> CoachPost.builder()
            .id(rs.getLong("id"))
            .groupId(rs.getLong("group_id"))
            .authorId(rs.getLong("author_id"))
            .content(rs.getString("content"))
            .postType(rs.getString("post_type"))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .build();

    public CoachPost create(CoachPost post) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO coach_posts (group_id, author_id, content, post_type) VALUES (?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, post.getGroupId());
            ps.setLong(2, post.getAuthorId());
            ps.setString(3, post.getContent());
            ps.setString(4, post.getPostType() != null ? post.getPostType() : "ADVICE");
            return ps;
        }, kh);
        post.setId(((Number) kh.getKeys().get("id")).longValue());
        return post;
    }

    public List<CoachPost> findByGroupId(Long groupId) {
        return jdbc.query(
            "SELECT * FROM coach_posts WHERE group_id = ? ORDER BY created_at DESC",
            rowMapper, groupId);
    }

    public Optional<CoachPost> findById(Long id) {
        return jdbc.query("SELECT * FROM coach_posts WHERE id = ?", rowMapper, id)
                .stream().findFirst();
    }

    public int update(CoachPost post) {
        return jdbc.update(
            "UPDATE coach_posts SET content = ?, post_type = ? WHERE id = ?",
            post.getContent(), post.getPostType(), post.getId());
    }

    public void delete(Long id) {
        jdbc.update("DELETE FROM coach_posts WHERE id = ?", id);
    }
}
