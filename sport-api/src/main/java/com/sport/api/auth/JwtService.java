package com.sport.api.auth;

import com.sport.api.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

	private final JwtProperties props;

	public JwtService(JwtProperties props) {
		this.props = props;
		String secret = props.getSecret();
		if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
			throw new IllegalStateException("sport.jwt.secret requires at least 32 bytes; configure SPORT_JWT_SECRET");
		}
	}

	private SecretKey key() {
		byte[] bytes = props.getSecret().getBytes(StandardCharsets.UTF_8);
		return Keys.hmacShaKeyFor(bytes);
	}

	public String createToken(Long userId, String username) {
		long now = System.currentTimeMillis();
		Date exp = new Date(now + props.getExpirationMs());
		return Jwts.builder()
				.subject(String.valueOf(userId))
				.claim("username", username)
				.issuedAt(new Date(now))
				.expiration(exp)
				.signWith(key())
				.compact();
	}

	public Optional<Claims> parse(String token) {
		try {
			Claims c = Jwts.parser()
					.verifyWith(key())
					.build()
					.parseSignedClaims(token)
					.getPayload();
			return Optional.of(c);
		} catch (Exception e) {
			return Optional.empty();
		}
	}
}
