{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  name = "etsubi";

  nativeBuildInputs = with pkgs; [
    pkg-config
    clang
    llvmPackages.bintools
    cmake
    gnumake
    libpq
    perl
    rustc
    cargo
    rustfmt
    clippy
    rust-analyzer
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

    echo "🦀 Rust: $(rustc --version)"
    echo "📦 Cargo: $(cargo --version)"
    echo "🔧 RLS: $(rust-analyzer --version 2>/dev/null || echo 'not found')"
  '';
}
