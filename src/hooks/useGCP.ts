import { useWalletSelector } from "components/WalletSelectorContextProvider";
import { useEffect, useState } from "react";
import { b64utoutf8, KJUR } from "jsrsasign";

const OAUTH_SCOPE =
  "https://www.googleapis.com/auth/cloud-platform.read-only https://www.googleapis.com/auth/compute";

// https://developers.google.com/identity/gsi/web/reference/js-reference
export default function useGCP() {
  const [oauthUser, setOAuthUser] = useState<any>();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authClient, setAuthClient] = useState<any>();
  const [projects, setProjects] = useState<any[]>();

  const { network } = useWalletSelector();

  const CLIENT_ID =
    network === "mainnet"
      ? "219952077564-nab34fgrudtespc62grk3er44t1iar1o.apps.googleusercontent.com"
      : "398338012986-f9ge03gubuvksee6rsmtorrpgtrsppf2.apps.googleusercontent.com";

  const handleCredentialResponse = (e: any) => {
    console.log("handleCredentialResponse", e);
    const headerObj = KJUR.jws.JWS.readSafeJSONString(
      b64utoutf8(e.credential.split(".")[0])
    );
    const payloadObj = KJUR.jws.JWS.readSafeJSONString(
      b64utoutf8(e.credential.split(".")[1])
    );
    console.log("headerObj", headerObj, payloadObj);
    setOAuthUser(payloadObj);

    const authorized =
      window.google.accounts.oauth2.hasGrantedAllScopes(OAUTH_SCOPE);

    window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: OAUTH_SCOPE,
      prompt: "select_account",
      callback(tokenResponse: any) {
        console.log(
          "tokenResponse",
          tokenResponse,
          window.google.accounts.oauth2.hasGrantedAllScopes(OAUTH_SCOPE)
        );
      },
      error_callback(error: any) {
        console.log("error", error);
      },
    });
    console.log("authorized", authorized);

    setIsAuthorized(authorized);
    if (authorized) {
      console.log("authorized", authorized);

      const request = window.gapi.client.request({
        method: "GET",
        path: "https://cloudresourcemanager.googleapis.com/v1/projects",
      });

      request.execute((res: any) => {
        setProjects(res?.projects);
        console.log(res);
      });
    }
  };

  const onLogin = () => {
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse,
    });
    window.google.accounts.id.prompt();
  };

  return {
    projects,
    isAuthorized,
    oauthUser,
    authClient,
    onLogin,
  };
}
