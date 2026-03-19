package com.fitforge.dao;

import com.fitforge.model.GroupInvite;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.Optional;

@Repository
public class GroupInviteDao {

    private final JdbcTemplate jdbc;

    public GroupInviteDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<GroupInvite> rowMapper = (rs, rowNum) -> GroupInvite.builder()
            .id(rs.getLong("id"))
            .groupId(rs.getLong("group_id"))
            .inviteEmail(rs.getString("invite_email"))
            .token(rs.getString("token"))
            .status(rs.getString("status"))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .expiresAt(rs.getTimestamp("expires_at").toLocalDateTime())
            .build();

    public GroupInvite create(GroupInvite invite) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO group_invites (group_id, invite_email, token, status, expires_at) " +
                "VALUES (?, ?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, invite.getGroupId());
            ps.setString(2, invite.getInviteEmail());
            ps.setString(3, invite.getToken());
            ps.setString(4, invite.getStatus() != null ? invite.getStatus() : "PENDING");
            ps.setTimestamp(5, Timestamp.valueOf(invite.getExpiresAt()));
            return ps;
        }, kh);
        invite.setId(((Number) kh.getKeys().get("id")).longValue());
        return invite;
    }

    public Optional<GroupInvite> findByToken(String token) {
        return jdbc.query("SELECT * FROM group_invites WHERE token = ?", rowMapper, token)
                .stream().findFirst();
    }

    public void updateStatus(Long id, String status) {
        jdbc.update("UPDATE group_invites SET status = ? WHERE id = ?", status, id);
    }
}
