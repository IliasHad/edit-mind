{
  description = "edit-mind dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # Node.js + package manager
            nodejs_22
            pnpm

            # Python (ML service; use uv to manage the venv)
            python311
            uv

            # Needed by Prisma and native Node modules
            openssl
            pkg-config

            # Video processing (background-jobs)
            ffmpeg

            # Utilities
            git
            curl
            jq
          ];

          shellHook = ''
            export PNPM_HOME="$HOME/.local/share/pnpm"
            export PATH="$PNPM_HOME:$PATH"
          '';
        };
      }
    );
}
