{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    pkg-config
    rustfmt
    rustc
    rust-analyzer
    clang
    llvmPackages.bintools
    cmake
    gnumake
    perl
  ];

  buildInputs = with pkgs; [
    postgresql
    openssl
    zlib
    zstd
  ];

  shellHook = ''
    export PKG_CONFIG_PATH="${pkgs.postgresql.lib}/lib/pkgconfig:$PKG_CONFIG_PATH"
    export PQ_LIB_DIR="${pkgs.postgresql.lib}/lib"
    export LD_LIBRARY_PATH="${pkgs.postgresql.lib}/lib:${pkgs.openssl.out}/lib:$LD_LIBRARY_PATH"
    export RUSTFLAGS="-C link-arg=-fuse-ld=lld"
  '';
}
