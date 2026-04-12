# Authentication Model

## Inspiration
Closest to Night Zookeeper's pattern — parent-managed child accounts with independent child credentials for cross-device login.

## Parent Auth
- **Credentials:** Email + password
- **Registration:** Email, password, payment details
- **Login:** Email + password every time (no PIN shortcut — prevents children accessing the parent dashboard on shared devices)
- **Session:** Standard session management
- **Future:** 2FA (v2)

## Child Auth
- **Credentials (two tiers):**
  - **Username + password** — for logging in on a new/own device. Username is set during account creation (parent-chosen or auto-generated). Password is child-set.
  - **PIN (4-digit)** — for returning to a known/shared device. Fast, low friction. Child-set.
- **No email required** — aligns with AADC data minimisation

## Device Flows

### Shared Device (e.g. parent's tablet)
1. Parent logs in once with email + password → registers the device to this family
2. On subsequent visits, the landing page shows:
   - "I'm a parent" → email + password required every time (no shortcut — security boundary)
   - "I'm a child" → shows child profile list for this family → child taps their name → PIN entry → child experience
3. The device "remembers" the family via a persistent local token

### Child's Own Device (e.g. older child's phone)
1. First time: child logs in with username + password → device is registered to their profile
2. Subsequent visits: PIN entry only (like a phone unlock)
3. Parent login is still available on the child's device if needed

### New/Unregistered Device
1. Landing page shows: "I'm a parent" (login) / "I'm a child" (login) / "Sign up"
2. "I'm a child" on an unregistered device → username + password login → registers device
3. "I'm a parent" → standard email + password login

## Parent Controls Over Credentials
- Parent can view child's username from the dashboard
- Parent can view/reset child's PIN from the dashboard
- Parent can reset child's password from the dashboard
- Child can change their own PIN and password from within their experience

## Security Considerations
- Parent login always requires full credentials (email + password) — never PIN-only. This is the hard boundary preventing children from accessing the parent dashboard.
- Child PINs are scoped per family — they're not global authentication, they're a convenience layer on a known device
- Device tokens should be revocable by the parent (e.g. "remove this device" from dashboard)
- Implementation details TBD: token storage, session expiry, brute-force protection on PIN entry
