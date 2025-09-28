import { createSignal, Show, createEffect } from "solid-js";
import { createAuthClient } from "better-auth/solid";
import { anonymousClient } from "better-auth/client/plugins";
import { Button } from "~/components/ui/button";
import { Flex } from "~/components/ui/flex";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from "~/components/ui/text-field";
import { Separator } from "~/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";

const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [anonymousClient()],
});

export default function LoginPage() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [isLogin, setIsLogin] = createSignal(true);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string>("");

  // Check if already logged in
  const session = authClient.useSession();
  console.log("Session", session()?.data?.user);

  const handleEmailPasswordAuth = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin()) {
        await authClient.signIn.email({
          email: email(),
          password: password(),
        });
      } else {
        await authClient.signUp.email({
          email: email(),
          password: password(),
          name: email().split("@")[0], // Use email prefix as name
        });
      }
      window.location.href = "/dashboard/";
    } catch (error: any) {
      console.error("Auth error:", error);
      setError(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const loginAnonymously = async () => {
    setLoading(true);
    setError("");
    try {
      await authClient.signIn.anonymous();
      window.location.href = "/dashboard/";
    } catch (error: any) {
      console.error("Anonymous login error:", error);
      setError("Anonymous login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="h-screen font-manrope overflow-hidden">
      <Show when={!session().isPending && session().data != null}>
        {(window.location.href = "/dashboard/")}
      </Show>
      <Dialog open={!!error()} onOpenChange={() => setError("")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authentication Error</DialogTitle>
            <DialogDescription>{error()}</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setError("")} class="w-full" variant="outline">
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Flex class="h-full">
        <div class="flex-1 relative overflow-hidden">
          <img
            src="/dolphin.jpeg"
            alt="Hero image"
            class="w-full h-full object-cover"
          />
        </div>

        <Flex
          class="w-[480px] px-12 border-l"
          justifyContent="center"
          alignItems="center"
          flexDirection="col"
        >
          <Card class="w-full max-w-sm">
            <CardHeader class="text-center">
              <Show
                when={session() && !session().isPending}
                fallback={
                  <>
                    <Flex
                      alignItems="center"
                      justifyContent="center"
                      class="gap-2 mb-4"
                    >
                      <Skeleton class="w-8 h-8 rounded" />
                      <Skeleton class="h-5 w-20" />
                    </Flex>
                    <Skeleton class="h-8 w-32 mx-auto mb-2" />
                    <Skeleton class="h-4 w-48 mx-auto" />
                  </>
                }
              >
                <Flex
                  alignItems="center"
                  justifyContent="center"
                  class="gap-2 mb-4"
                >
                  <div class="w-8 h-8 rounded bg-primary" />
                  <span class="font-semibold text-xl">{{PROJECT_NAME}}</span>
                </Flex>
                <CardTitle class="text-2xl">
                  {isLogin() ? "Welcome back" : "Create account"}
                </CardTitle>
                <p class="text-muted-foreground">
                  {isLogin()
                    ? "Sign in to your account"
                    : "Get started with {{PROJECT_NAME}}"}
                </p>
              </Show>
            </CardHeader>

            <CardContent class="space-y-6">
              <Show
                when={session() && !session().isPending}
                fallback={
                  <>
                    <div class="space-y-4">
                      <div class="space-y-2">
                        <Skeleton class="h-4 w-12" />
                        <Skeleton class="h-10 w-full" />
                      </div>
                      <div class="space-y-2">
                        <Skeleton class="h-4 w-16" />
                        <Skeleton class="h-10 w-full" />
                      </div>
                      <Skeleton class="h-10 w-full" />
                    </div>
                    <Skeleton class="h-4 w-40 mx-auto" />
                    <Skeleton class="h-10 w-full" />
                    <Skeleton class="h-4 w-24 mx-auto" />
                  </>
                }
              >
                <form onSubmit={handleEmailPasswordAuth} class="space-y-4">
                  <TextField>
                    <TextFieldLabel>Email</TextFieldLabel>
                    <TextFieldInput
                      type="email"
                      placeholder="Enter your email"
                      value={email()}
                      onInput={(e) => setEmail(e.currentTarget.value)}
                      required
                    />
                  </TextField>

                  <TextField>
                    <TextFieldLabel>Password</TextFieldLabel>
                    <TextFieldInput
                      type="password"
                      placeholder="Enter your password"
                      value={password()}
                      onInput={(e) => setPassword(e.currentTarget.value)}
                      required
                    />
                  </TextField>

                  <Button type="submit" class="w-full" disabled={loading()}>
                    {loading()
                      ? "Please wait..."
                      : isLogin()
                        ? "Sign In"
                        : "Create Account"}
                  </Button>
                </form>

                <div class="text-center">
                  <Button
                    variant="link"
                    onClick={() => setIsLogin(!isLogin())}
                    class="text-sm"
                  >
                    {isLogin()
                      ? "Don't have an account? Create one"
                      : "Already have an account? Sign in"}
                  </Button>
                </div>

                <div class="relative">
                  <Separator />
                  <div class="absolute inset-0 flex items-center justify-center">
                    <span class="bg-background px-2 text-xs text-muted-foreground">
                      or
                    </span>
                  </div>
                </div>

                <Button
                  onClick={loginAnonymously}
                  variant="outline"
                  class="w-full"
                  disabled={loading()}
                >
                  {loading() ? "Please wait..." : "Try Anonymously"}
                </Button>

                <div class="text-center">
                  <Button
                    variant="link"
                    onClick={() => (window.location.href = "/")}
                    class="text-sm text-muted-foreground"
                  >
                    ← Back to home
                  </Button>
                </div>
              </Show>
            </CardContent>
          </Card>
        </Flex>
      </Flex>
    </div>
  );
}