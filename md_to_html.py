#!/usr/bin/env python3
"""
Converte arquivos Markdown para HTML usando o tema compartilhado mira-animator.
Uso: python3 md_to_html.py <arquivo.md> [caminho_relativo_para_theme.css]

Se o caminho do CSS não for informado, calcula automaticamente baseado na localização do arquivo.
"""
import sys
import os
import markdown
from pathlib import Path

REPO_ROOT = Path(__file__).parent.resolve()
THEME_CSS_ABS = REPO_ROOT / "seduc-pa-2026" / "slides" / "assets" / "theme.css"

def calculate_theme_rel_path(md_path: Path) -> str:
    """Calcula caminho relativo do theme.css baseado na localização do arquivo .md"""
    md_abs = md_path.resolve()
    # Caminho relativo do arquivo .md até a raiz do repo
    try:
        rel_to_root = md_abs.relative_to(REPO_ROOT)
    except ValueError:
        # Arquivo fora do repo - usa default
        return "../../../../slides/assets/theme.css"
    
    # Conta quantos níveis de diretórios a partir de seduc-pa-2026/
    # parts inclui: [seduc-pa-2026, dir1, dir2, ..., arquivo.md]
    # Diretórios abaixo de seduc-pa-2026 = len(parts) - 2
    depth_dirs = len(rel_to_root.parts) - 2
    
    # theme.css está em seduc-pa-2026/slides/assets/theme.css
    # Precisa subir depth_dirs níveis para chegar em seduc-pa-2026/
    if depth_dirs <= 0:
        return "slides/assets/theme.css"
    else:
        up = ".." * depth_dirs
        return f"{up}/slides/assets/theme.css"

def calculate_nav_paths(md_path: Path) -> tuple:
    """Calcula caminhos de navegação (índice, disciplina) baseado na localização"""
    md_abs = md_path.resolve()
    try:
        rel_to_root = md_abs.relative_to(REPO_ROOT)
    except ValueError:
        return ("../../", "../")
    
    if rel_to_root.parts[0] != "seduc-pa-2026":
        return ("../../", "../")
    
    depth = len(rel_to_root.parts) - 1
    
    if depth == 1:
        return ("../", "../")
    elif depth == 2:
        return ("../../", "../")
    elif depth == 3:
        return ("../../../", "../../")
    elif depth == 4:
        return ("../../../../", "../../../")
    elif depth == 5:
        return ("../../../../", "../../../")
    else:
        return ("../../", "../")


def calculate_sequential_nav(md_path: Path) -> tuple:
    """
    Calcula navegação sequencial (anterior/próximo) baseada em arquivos irmãos
    com prefixo numérico (01-, 02-, 03-, etc.) no mesmo diretório.
    Retorna (prev_rel, next_rel) ou (None, None) se não houver.
    """
    md_abs = md_path.resolve()
    parent_dir = md_abs.parent
    
    # Busca todos arquivos .md no mesmo diretório
    md_files = sorted(parent_dir.glob("*.md"))
    if len(md_files) < 2:
        return (None, None)
    
    # Filtra apenas os que têm prefixo numérico (01-, 02-, etc.)
    numbered_files = []
    for f in md_files:
        name = f.name
        if len(name) >= 3 and name[0:2].isdigit() and name[2] == '-':
            numbered_files.append(f)
    
    if len(numbered_files) < 2:
        return (None, None)
    
    # Ordena por prefixo numérico
    numbered_files.sort(key=lambda f: int(f.name[0:2]))
    
    # Encontra posição do arquivo atual
    current_idx = None
    for i, f in enumerate(numbered_files):
        if f == md_abs:
            current_idx = i
            break
    
    if current_idx is None:
        return (None, None)
    
    prev_rel = None
    next_rel = None
    
    if current_idx > 0:
        prev_file = numbered_files[current_idx - 1]
        prev_rel = prev_file.with_suffix('.html').name
    
    if current_idx < len(numbered_files) - 1:
        next_file = numbered_files[current_idx + 1]
        next_rel = next_file.with_suffix('.html').name
    
    return (prev_rel, next_rel)

def convert_md_to_html(md_path, theme_rel_path=None):
    """Converte markdown para HTML com tema mira-animator."""
    
    # Calcula caminhos automaticamente se não fornecidos
    if theme_rel_path is None:
        theme_rel_path = calculate_theme_rel_path(md_path)
    
    index_rel, disciplina_rel = calculate_nav_paths(md_path)
    prev_rel, next_rel = calculate_sequential_nav(md_path)
    
    # Lê o markdown
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Converte para HTML
    md = markdown.Markdown(extensions=['fenced_code', 'tables', 'toc', 'attr_list'])
    html_content = md.convert(md_content)
    
    # Extrai título do primeiro h1
    title = "Conteúdo"
    for line in md_content.split('\n'):
        if line.startswith('# '):
            title = line[2:].strip()
            break
    
    # Template HTML com caminhos calculados
    html_template = f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} — SEDUC-PA 2026</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="{theme_rel_path}" rel="stylesheet">
</head>
<body>
    <header class="header">
        <div class="container header-content">
            <a href="{index_rel}../" class="logo">SEDUC-PA <span>2026</span></a>
            <nav class="nav-links">
                <a href="{index_rel}../">Início</a>
                <a href="{index_rel}../slides/">Slides</a>
                <a href="{index_rel}" class="active">Conteúdo</a>
            </nav>
        </div>
    </header>

    <main class="container">
        <article class="glass-card" style="max-width: 900px; margin: 0 auto;">
            {html_content}
        </article>
        
        <nav style="margin-top: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                {f'<a href="{prev_rel}" class="btn btn-outline">← Tópico Anterior</a>' if prev_rel else ''}
                {f'<a href="{next_rel}" class="btn btn-primary">Próximo Tópico →</a>' if next_rel else ''}
            </div>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <a href="{index_rel}" class="btn btn-outline">← Voltar ao índice</a>
                <a href="{disciplina_rel}" class="btn btn-outline">← Voltar à disciplina</a>
            </div>
        </nav>
    </main>

    <footer class="footer">
        <div class="container">
            <p>SEDUC-PA 2026 — Especialista em Educação</p>
            <p style="margin-top: 0.5rem;">
                <a href="https://github.com/nicacarvalho5/concursos" target="_blank">Repositório</a>
            </p>
        </div>
    </footer>
</body>
</html>'''
    
    # Determina arquivo de saída
    html_path = md_path.with_suffix('.html')
    
    # Escreve HTML
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_template)
    
    print(f"✓ Criado: {html_path}")
    print(f"  CSS: {theme_rel_path}")
    print(f"  Index: {index_rel} | Disciplina: {disciplina_rel}")
    return html_path

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python3 md_to_html.py <arquivo.md> [caminho_theme.css]")
        sys.exit(1)
    
    md_file = Path(sys.argv[1])
    theme_rel = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not md_file.exists():
        print(f"Erro: {md_file} não encontrado")
        sys.exit(1)
    
    convert_md_to_html(md_file, theme_rel)