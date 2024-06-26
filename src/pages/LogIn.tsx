import { t, Trans } from "@lingui/macro";
import { Envelope, GithubLogo, Lock } from "phosphor-react";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "react-query";

import { Warning } from "../components/Warning";
import { supabase } from "../lib/supabaseClient";
import { Button2, InputWithLabel, P, Page } from "../ui/Shared";
import { PageTitle } from "../ui/Typography";
import { ReactComponent as EmailPassword } from "./EmailPassword.svg";
import { Link, useNavigate } from "react-router-dom";
import { AuthOtpResponse } from "@supabase/supabase-js";
import { useLocation } from "react-router-dom";
import { useIsLoggedIn } from "../lib/hooks";
import { AppContext } from "../components/AppContextProvider";
import GoogleSVG from "../components/GoogleSVG";
import { GoogleAuthProvider,signInWithPopup,createUserWithEmailAndPassword,signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../utils/firebase";

const provider = new GoogleAuthProvider();


type Fields = {
  email: string;
};

export default function Login() {
  // check for auth wall warning
  const { search } = useLocation();
  const [showAuthWallWarning, redirectUrl] =
    checkForAuthWallWarningAndRedirect(search);

  // check and see if there is
  const { register, handleSubmit } = useForm<Fields>();
  const [success, setSuccess] = useState(false);
  const { mutate, isLoading, error } = useMutation<
    AuthOtpResponse,
    Record<string, never>,
    { email: string }
  >(
    async ({ email }) => {
      if (!supabase) throw new Error("No supabase client");
      return supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
    },
    {
      onSuccess: () => setSuccess(true),
    }
  );

  // Watch log in state and redirect if it changes
  const navigate = useNavigate();
  const { checkedSession } = useContext(AppContext);
  const isLoggedIn = useIsLoggedIn();
  useEffect(() => {
    if (!checkedSession) return;
    if (checkedSession && isLoggedIn) {
      // go to account page
      window.location.href = redirectUrl;
    }
  }, [checkedSession, isLoggedIn, navigate, redirectUrl]);

  const onSubmit = useCallback(
    ({ email }: Fields) => {
      mutate({ email });
    },
    [mutate]
  );

  if (success) {
    return (
      <div className="pt-12 grid justify-items-center content-start gap-4 w-full max-w-[440px] mx-auto text-center">
        <EmailPassword
          width={180}
          height={180}
          className="stroke-foreground dark:stroke-background"
        />
        <P>
          <Trans>
            Check your email for a link to log in.
            <br />
            You can close this window.
          </Trans>
        </P>
        <div className="text-neutral-600 ml-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-6">
            <Trans>
              Once in a while the magic link will end up in your spam folder. If
              you don&apos;t see it after a few minutes, check there or request
              a new link.
            </Trans>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Page size="sm">
      <PageTitle className="text-center mb-6">{t`Sign In`}</PageTitle>
      <Button2
        leftIcon={<GoogleSVG />}
        className="!bg-white border-solid border dark:border-none border-neutral-400 !py-0 !gap-1 hover:!bg-neutral-100 !text-black"
        onClick={() => {
          signInWithPopup(auth, provider)
          .then((result) => {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if(credential){
              const token = credential?.accessToken;
              const user = result.user;
              console.log(user);
              localStorage.setItem("UID",user.uid)
              window.location.reload()
            }
          }).catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.customData.email;
            const credential = GoogleAuthProvider.credentialFromError(error);
            console.log(error);
          });
        }}
      >
        <Trans>
          Sign in with <span>Google</span>
        </Trans>
      </Button2>
      <Or />
      
      <UserPass redirectUrl={redirectUrl} />
    </Page>
  );
}

function AuthWallWarning() {
  return (
    <div className="bg-yellow-100 text-foreground p-4 text-center text-md grid gap-2 mb-6 leading-normal rounded-lg">
      <p className="font-bold">
        <Trans>You need to log in to access this page.</Trans>
      </p>
      <p className="text-wrap-balance">
        <Trans>
          To learn more about why we require you to log in, please read{" "}
          <Link to="/blog/post/important-changes-coming" className="underline">
            this blog post
          </Link>
          .
        </Trans>
      </p>
    </div>
  );
}

function checkForAuthWallWarningAndRedirect(search: string): [boolean, string] {
  const params = new URLSearchParams(search);
  const showAuthWallWarning = params.get("showAuthWallWarning") === "true";
  const redirectUrl = decodeURIComponent(params.get("redirectUrl") || "/"); // default to home page
  return [showAuthWallWarning, redirectUrl];
}

function Or() {
  return (
    <div className="relative my-10">
      <hr className="max-w-[80px] mx-auto" />
      <p className="text-xs text-center text-neutral-400 leading-normal dark:text-neutral-400 bg-white dark:bg-[#0f0f0f] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-2 -mt-px">
        <Trans>or</Trans>
      </p>
    </div>
  );
}

function UserPass({ redirectUrl }: { redirectUrl: string }) {
  const [method, setMethod] = useState<"Sign In" | "Sign Up">("Sign In");
  const formRef = useRef<HTMLFormElement>(null);
  const signInMutation = useMutation<
    string,
    Record<string, never>,
    { email: string; password: string }
  >(
    async ({ email, password }) => {
      if (!auth) throw new Error("No firebase client");

      if (method === "Sign Up") {
        // return t`Confirm your email address to sign in.`;

        createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed up 
          const user = userCredential.user;
          localStorage.setItem("UID",user.uid)
          window.location.href = redirectUrl
          // ...
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          throw error
        });
        return t``
      } else {
        signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed in 
          const user = userCredential.user;
          localStorage.setItem("UID",user.uid)
          window.location.href = redirectUrl

        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          throw error
        });

        // Returns empty string if login was successful for existing user
        return "";
      }
    },
    {
      onSuccess: () => {
        // reset form
        formRef.current?.reset();

        // if no message, this will be redirected by root
      },
    }
  );
  const handleSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const formdata = new FormData(e.target as HTMLFormElement);
      const email = formdata.get("email") as string;
      const password = formdata.get("password") as string;

      if (!email || !password) return;

      signInMutation.mutate({ email, password });
    },
    [signInMutation]
  );
  return (
    <>
      <P>
        <span className="text-[12px] font-mono inline-block mr-2 -translate-y-px text-blue-500">
          <Trans>Choose</Trans>:{" "}
        </span>
        <Trans>
          <button
            className="p-[2px] border-b border-neutral-400 border-solid border-0 opacity-30 data-[active=true]:opacity-100"
            data-active={method === "Sign In"}
            onClick={() => setMethod("Sign In")}
          >
            Sign In
          </button>{" "}
          /{" "}
          <button
            data-active={method === "Sign Up"}
            className="p-[2px] border-b border-neutral-400 border-solid border-0 opacity-30 data-[active=true]:opacity-100"
            onClick={() => setMethod("Sign Up")}
          >
            Sign Up
          </button>{" "}
          with email and password
        </Trans>
      </P>
      <form className="gap-2 grid" onSubmit={handleSubmit} ref={formRef}>
        <InputWithLabel
          label={t`Email`}
          inputProps={{
            autoComplete: "email",
            name: "email",
            required: true,
            type: "email",
            // @ts-ignore
            ["data-testid"]: "sign-in-email",
            disabled: signInMutation.isLoading,
          }}
        />
        <InputWithLabel
          label={t`Password`}
          inputProps={{
            autoComplete: "current-password",
            name: "password",
            required: true,
            type: "password",
            pattern: ".{6,}",
            // @ts-ignore
            ["data-testid"]: "sign-in-password",
            disabled: signInMutation.isLoading,
          }}
        />
        <Button2
          type="submit"
          className="w-full justify-center"
          isLoading={signInMutation.isLoading}
          leftIcon={<Lock size={24} />}
          data-testid="sign-in-email-pass"
        >
          <Trans>Sign In</Trans>
        </Button2>
        {signInMutation.isError && (
          <Warning>{signInMutation.error.message}</Warning>
        )}
        {signInMutation.data && <Warning>{signInMutation.data}</Warning>}
      </form>
      <p className="text-center text-neutral-500 leading-normal dark:text-neutral-400 mb-3 text-xs">
        <Link to="/forgot-password">
          <Trans>Forgot your password?</Trans>
        </Link>
      </p>
    </>
  );
}
