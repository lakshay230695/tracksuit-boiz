{
  inputs.nixpkgs.url = "github:nixos/nixpkgs/release-24.11";

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        name = "take-home-test";
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            deno
          ];
        };
      });
}
