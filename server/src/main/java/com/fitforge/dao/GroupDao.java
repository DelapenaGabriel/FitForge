package com.fitforge.dao;

import com.fitforge.model.Group;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class GroupDao {

    private final JdbcTemplate jdbc;

    public GroupDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<Group> rowMapper = (rs, rowNum) -> Group.builder()
            .id(rs.getLong("id"))
            .name(rs.getString("name"))
            .description(rs.getString("description"))
            .ownerId(rs.getLong("owner_id"))
            .startDate(rs.getDate("start_date").toLocalDate())
            .endDate(rs.getDate("end_date").toLocalDate())
            .status(rs.getString("status"))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .build();

    public Group create(Group group) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO groups (name, description, owner_id, start_date, end_date, status) " +
                "VALUES (?, ?, ?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, group.getName());
            ps.setString(2, group.getDescription());
            ps.setLong(3, group.getOwnerId());
            ps.setDate(4, Date.valueOf(group.getStartDate()));
            ps.setDate(5, Date.valueOf(group.getEndDate()));
            ps.setString(6, group.getStatus() != null ? group.getStatus() : "ACTIVE");
            return ps;
        }, kh);
        group.setId(((Number) kh.getKeys().get("id")).longValue());
        return group;
    }

    public Optional<Group> findById(Long id) {
        return jdbc.query("SELECT * FROM groups WHERE id = ?", rowMapper, id)
                .stream().findFirst();
    }

    public List<Group> findByUserId(Long userId) {
        return jdbc.query(
            "SELECT g.* FROM groups g " +
            "JOIN group_members gm ON g.id = gm.group_id " +
            "WHERE gm.user_id = ? AND g.status = 'ACTIVE' ORDER BY g.created_at DESC",
            rowMapper, userId);
    }

    public void update(Group group) {
        jdbc.update(
            "UPDATE groups SET name = ?, description = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?",
            group.getName(), group.getDescription(),
            Date.valueOf(group.getStartDate()), Date.valueOf(group.getEndDate()),
            group.getStatus(), group.getId());
    }

    public void delete(Long id) {
        jdbc.update("UPDATE groups SET status = 'ARCHIVED' WHERE id = ?", id);
    }
}
