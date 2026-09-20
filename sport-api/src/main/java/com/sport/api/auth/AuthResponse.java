package com.sport.api.auth;

public record AuthResponse(String token, String username, String nickname) {
}
