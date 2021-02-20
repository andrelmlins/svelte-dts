<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let clientId: string;
  export let state: string;
  export let redirectUri: string;
  export let responseType: string | undefined = undefined;
  export let scope: string | undefined = undefined;

  const dispatch = createEventDispatcher<{
    success: Record<string, any>;
    error: Error;
    request: never;
  }>();
  const urlFacebook = "https://www.facebook.com/v5.0/dialog/oauth";
  let interval: number | null = 0;
  let popupWindow: Window | null;

  const convertQueryParams = (url: string): Record<string, any> => {
    const query = url.substr(1);
    const result: Record<string, any> = {};

    query.split("&").forEach((param) => {
      const item = param.split("=");
      result[item[0]] = decodeURIComponent(item[1]);
    });

    return result;
  };

  const close = () => {
    if (interval) {
      window.clearInterval(interval);
      interval = null;
    }

    if (popupWindow) {
      popupWindow.close();
    }
  };

  // SvelteGithubLogin based
  const poll = () => {
    interval = window.setInterval(() => {
      try {
        if (!popupWindow || popupWindow.closed !== false) {
          close();
          dispatch("error", new Error("The popup was closed"));
          return;
        }

        if (
          popupWindow.location.href === urlFacebook ||
          popupWindow.location.pathname === "blank"
        ) {
          return;
        }

        dispatch("success", convertQueryParams(popupWindow.location.search));
        close();
      } catch (error) {
        // error
      }
    }, 500);
  };

  const onLogin = () => {
    let urlParams = `client_id=${clientId}&state=${state}&redirect_uri=${redirectUri}`;

    if (responseType) {
      urlParams += `&response_type=${responseType}`;
    }

    if (scope) {
      urlParams += `&scope=${scope}`;
    }

    popupWindow = window.open(
      `${urlFacebook}?${urlParams}`,
      "facebook-oauth",
      ""
    );

    dispatch("request");

    poll();
  };
</script>

<slot {onLogin} />
