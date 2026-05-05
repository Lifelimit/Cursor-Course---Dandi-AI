import os
import re

files_server = [
    "app/playground/page.tsx",
    "app/usage/page.tsx",
    "app/protected/page.tsx",
    "app/api/usage/route.ts",
    "app/api/stripe/portal/route.ts",
    "app/api/stripe/setup-session/route.ts",
    "app/api/stripe/checkout/route.ts",
    "app/api/stripe/set-default-payment/route.ts",
    "app/api/stripe/delete-payment/route.ts",
    "app/api/stripe/cancel-subscription/route.ts",
    "lib/services/auth.service.ts"
]

for filepath in files_server:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace import
    content = re.sub(r'import\s+{\s*auth\s*}\s+from\s+["\']@/auth["\'];?', 'import { createClient } from "@/lib/supabase/server";', content)
    
    # Replace auth() call
    content = re.sub(r'const\s+session\s*=\s*await\s+auth\(\);?', 'const supabase = await createClient();\n  const { data: { session } } = await supabase.auth.getSession();', content)
    
    with open(filepath, 'w') as f:
        f.write(content)

# For login and signup, they should redirect to /dashboards if logged in, but with supabase
files_auth_pages = ["app/login/page.tsx", "app/signup/page.tsx"]
for filepath in files_auth_pages:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    content = re.sub(r'import\s+{\s*auth\s*}\s+from\s+["\']@/auth["\'];?', 'import { createClient } from "@/lib/supabase/server";', content)
    content = re.sub(r'const\s+session\s*=\s*await\s+auth\(\);?', 'const supabase = await createClient();\n  const { data: { session } } = await supabase.auth.getSession();', content)
    with open(filepath, 'w') as f:
        f.write(content)

# For client components
files_client = [
    "app/playground/PlaygroundClient.tsx",
    "app/usage/UsageClient.tsx",
    "app/protected/ProtectedClient.tsx"
]

for filepath in files_client:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()
    content = re.sub(r'import\s+{\s*useSession\s*}\s+from\s+["\']next-auth/react["\'];?\n?', '', content)
    content = re.sub(r'import\s+(type\s+)?{\s*Session\s*}\s+from\s+["\']next-auth["\'];?', 'import type { Session } from "@supabase/supabase-js";', content)
    content = re.sub(r'\s*const\s+{\s*data:\s*session\s*}\s*=\s*useSession\(\);?\n?', '\n', content)
    content = re.sub(r'const\s+activeSession\s*=\s*initialSession\s*\|\|\s*session;?', 'const activeSession = initialSession;', content)
    with open(filepath, 'w') as f:
        f.write(content)

# Special handle for SubscriptionModal.tsx
with open("components/dashboard/SubscriptionModal.tsx", 'r') as f:
    content = f.read()
content = re.sub(r'import\s+{\s*useSession\s*}\s+from\s+["\']next-auth/react["\'];?\n?', '', content)
content = re.sub(r'\s*const\s+{\s*data:\s*session,\s*update\s*}\s*=\s*useSession\(\);?\n?', '\n', content)
# We might need session inside. Let's just remove session usage if possible or replace with router.refresh where update() was used
content = content.replace("update()", "router.refresh()")
# Replace session={session} with session={null} or something since we don't have it. Actually we don't need it or we can pass it down
# Let's see if session is used heavily. We saw `const s = session?.user;`.
with open("components/dashboard/SubscriptionModal.tsx", 'w') as f:
    f.write(content)
