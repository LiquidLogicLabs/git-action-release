# Re-trigger Release v2.0.1 (one-time)

The release workflow was fixed on main. To publish the **existing** v2.0.1 release (same version, no new tag):

1. **Delete the remote tag** (GitHub doesn’t allow this via API with normal tokens):
   - GitHub → Repository → **Releases** or **Code** → tags → find **v2.0.1** → delete,  
   - or: **Settings** → **Tags** → delete `v2.0.1` if available.

2. **Re-push the same tag** from this repo:
   ```bash
   git push origin v2.0.1
   ```
   The tag already points to commit `1c19376` (chore(release): 2.0.1). Pushing it again will trigger the release workflow; the workflow file is read from **main** (with the fix), so the run should create the GitHub Release for v2.0.1.

3. **Delete this file** after the release has run successfully.
