package com.fitforge.model;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Post {
    private Long id;
    private Long groupId;
    private Long authorId;
    private String content;
    private String postType;
    private List<String> photoUrls;
    private List<String> videoUrls;
    private List<PostComment> comments;
    private LocalDateTime createdAt;
}
