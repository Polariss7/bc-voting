import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("./config/env", () => ({
  appConfig: {
    contractAddress: "0x0000000000000000000000000000000000000001",
    chainId: 31337,
    rpcUrl: "",
    explorerUrl: "",
  },
  isConfigured: true,
}));

import App, { GuidedMode, RequireMetaMask } from "./App";

type WalletFixture = Parameters<typeof RequireMetaMask>[0]["wallet"];

function wallet(overrides: Partial<WalletFixture> = {}): WalletFixture {
  return {
    address: undefined,
    provider: undefined,
    chainId: undefined,
    connect: async () => undefined,
    switchNetwork: async () => undefined,
    error: "",
    status: "disconnected",
    ...overrides,
  };
}

function renderGate(value: Partial<WalletFixture> = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <RequireMetaMask wallet={wallet(value)}>
        <div>protected election content</div>
      </RequireMetaMask>
    </MemoryRouter>,
  );
}

describe("RequireMetaMask route guard", () => {
  it("keeps the public landing page available without MetaMask", () => {
    expect(
      renderToStaticMarkup(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>,
      ),
    ).toContain("Make the ballot");
  });

  it("blocks disconnected access and shows the MetaMask action", () => {
    const html = renderGate({ status: "disconnected" });
    expect(html).toContain("Connect MetaMask to continue");
    expect(html).toContain("Connect MetaMask");
    expect(html).not.toContain("protected election content");
  });

  it("blocks when MetaMask is unavailable", () => {
    const html = renderGate({ status: "unavailable" });
    expect(html).toContain("MetaMask is required");
    expect(html).toContain("MetaMask is required to use SecureVote");
    expect(html).toContain("metamask.io/download");
    expect(html).not.toContain("protected election content");
  });

  it("shows pending and rejected connection states", () => {
    expect(renderGate({ status: "connecting" })).toContain(
      "Waiting for MetaMask",
    );
    expect(
      renderGate({ status: "error", error: "User rejected the request." }),
    ).toContain("User rejected the request.");
  });

  it("blocks a connected wallet on the wrong network", () => {
    const html = renderGate({
      status: "connected",
      address: "0x0000000000000000000000000000000000000002",
      chainId: 1,
    });
    expect(html).toContain("Switch MetaMask network");
    expect(html).toContain("chain ID 31337");
    expect(html).not.toContain("protected election content");
  });

  it("renders protected content only for a connected wallet on the configured chain", () => {
    const html = renderGate({
      status: "connected",
      address: "0x0000000000000000000000000000000000000002",
      chainId: 31337,
    });
    expect(html).toContain("protected election content");
  });

  it("does not allow a URL parameter to bypass the disconnected checkpoint", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          "/dashboard?wallet=0x0000000000000000000000000000000000000002",
        ]}
      >
        <RequireMetaMask wallet={wallet()}>
          <div>protected election content</div>
        </RequireMetaMask>
      </MemoryRouter>,
    );
    expect(html).toContain("Connect MetaMask to continue");
    expect(html).not.toContain("protected election content");
  });
});

describe("Guided mode", () => {
  it("is available without MetaMask and does not invent election data", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/guide"]}>
        <GuidedMode wallet={wallet({ status: "unavailable" })} />
      </MemoryRouter>,
    );
    expect(html).toContain("Follow one ballot from wallet to block.");
    expect(html).toContain("MetaMask not detected");
    expect(html).toContain("The chain is the backend.");
    expect(html).not.toContain("Election / 001");
  });

  it("reports actual connected-chain state in the wallet tutorial step", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <GuidedMode
          wallet={wallet({
            status: "connected",
            address: "0x0000000000000000000000000000000000000002",
            chainId: 31337,
          })}
        />
      </MemoryRouter>,
    );
    expect(html).toContain("Connected · Hardhat local");
    expect(html).toContain("Follow one ballot from wallet to block.");
  });
});
