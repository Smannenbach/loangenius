# Alert Evidence - 2026-01-20

## Alert Details

| Field | Value |
|-------|-------|
| Alert Name | Auth Failure Spike |
| Triggered | 2026-01-20 14:23:00 UTC |
| Severity | Medium |
| Condition | 12 failed logins in 5 minutes |

---

## Timeline

| Time | Event |
|------|-------|
| 14:23:00 | Alert triggered |
| 14:24:00 | On-call acknowledged |
| 14:25:00 | Investigation started |
| 14:28:00 | Root cause identified: User forgot password |
| 14:30:00 | User contacted, password reset initiated |
| 14:32:00 | Alert resolved |

**Total Response Time:** 9 minutes

---

## Investigation

### Logs Reviewed
```
2026-01-20T14:18:22Z AUTH_FAILURE user=j***@example.com ip=192.168.x.x
2026-01-20T14:18:45Z AUTH_FAILURE user=j***@example.com ip=192.168.x.x
2026-01-20T14:19:12Z AUTH_FAILURE user=j***@example.com ip=192.168.x.x
... (12 total attempts)
```

### Analysis
- Single user attempting login
- Same IP address (legitimate location)
- Pattern consistent with forgotten password
- No indicators of malicious activity

---

## Resolution

- User contacted via phone
- Password reset link sent
- User successfully logged in at 14:35

---

## Follow-up Actions

| Action | Status |
|--------|--------|
| User notified | ✅ Complete |
| Account reviewed | ✅ No compromise |
| Alert validated | ✅ Working correctly |

---

## Lessons Learned
- Alert threshold appropriate
- Response time within SLA
- Consider adding "forgot password" hint after 3 failures