package com.sport.api.auth;

import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CurrentUserProvider {

	private final JwtService jwtService;

	public CurrentUserProvider(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	public Long requireUserId(String authorization) {
		if (authorization == null || !authorization.startsWith("Bearer ")) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "未登录");
		}
		String token = authorization.substring(7).trim();
		Claims claims = jwtService.parse(token)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "无效或过期的令牌"));
		return Long.parseLong(claims.getSubject());
	}
}
