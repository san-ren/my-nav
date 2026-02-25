#!/usr/bin/env python3
"""
图标去重和引用更新程序 v3
===========================

功能：
1. 找出所有重复图标（相同哈希）
2. 更新 JSON 文件中的引用
3. 删除多余图标文件
4. 处理未引用文件

缓存策略说明：
- domainIconCache: 仅用于普通网站（不用于 GitHub/Google Play）
- githubIconCache: 按 user/repo 缓存 GitHub 项目图标
- googlePlayIconCache: 按 appId 缓存 Google Play 应用图标
- iconHashCache: 相同图标复用文件

通用图标：
- github-default.webp: 当 GitHub 项目无法获取用户头像时使用
- googleplay-default.webp: 当 Google Play 应用无法获取应用图标时使用
"""

import os
import hashlib
import json
import re
import shutil
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# ==================== 配置 ====================
ICONS_DIR = Path('./public/images/logos')
CONTENT_DIR = Path('./src/content/nav-groups')
BACKUP_DIR = Path('./icon_cleanup_backup')

# 通用图标配置（当无法获取特定图标时使用）
GENERIC_ICONS = {
    'github': {
        'filename': 'github-default.webp',
        'source_domain': 'github.com',
        'description': 'GitHub 通用图标（当无法获取用户头像时使用）',
    },
    'googleplay': {
        'filename': 'googleplay-default.webp',
        'source_domain': 'play.google.com',
        'description': 'Google Play 通用图标（当无法获取应用图标时使用）',
    },
}

# 是否执行模式（False = 只预览）
DRY_RUN = False

# ==================== 工具函数 ====================

def calculate_file_hash(filepath: Path) -> str:
    """计算文件 MD5 哈希"""
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def backup_files():
    """备份文件"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = BACKUP_DIR / timestamp
    
    shutil.copytree(ICONS_DIR, backup_path / 'logos')
    shutil.copytree(CONTENT_DIR, backup_path / 'nav-groups')
    
    print(f"备份完成: {backup_path}")
    return backup_path

def analyze_icons():
    """分析所有图标"""
    hash_to_files = defaultdict(list)
    file_to_hash = {}
    
    for file in ICONS_DIR.glob('*.webp'):
        file_hash = calculate_file_hash(file)
        hash_to_files[file_hash].append(file.name)
        file_to_hash[file.name] = file_hash
    
    return hash_to_files, file_to_hash

def find_all_references():
    """查找所有图标引用"""
    references = defaultdict(list)
    
    for json_file in CONTENT_DIR.glob('*.json'):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            pattern = r'"icon":\s*"(/images/logos/([^"?]+)[^"]*)"'
            for match in re.finditer(pattern, content):
                full_path = match.group(1)
                filename = match.group(2)
                references[filename].append({
                    'file': json_file,
                    'full_path': full_path,
                })
        except Exception as e:
            print(f"  警告: 读取 {json_file.name} 失败: {e}")
    
    return references

def select_best_file(files: list, references: dict) -> str:
    """选择最佳保留文件（优先选择被引用最多的）"""
    ref_counts = [(f, len(references.get(f, []))) for f in files]
    
    # 优先选择通用图标文件名
    for f, count in ref_counts:
        if 'default' in f.lower():
            return f
    
    # 否则选择引用最多的
    ref_counts.sort(key=lambda x: (-x[1], x[0]))
    return ref_counts[0][0]

def update_json_references(replacements: dict, dry_run: bool = True):
    """更新 JSON 文件中的引用"""
    updated_files = 0
    total_replacements = 0
    
    for json_file in CONTENT_DIR.glob('*.json'):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            file_replacements = 0
            
            for old_file, new_file in replacements.items():
                if old_file == new_file:
                    continue
                
                patterns = [
                    (f'"/images/logos/{old_file}"', f'"/images/logos/{new_file}"'),
                    (f'"/images/logos/{old_file}?t=', f'"/images/logos/{new_file}?t='),
                ]
                
                for old_pattern, new_pattern in patterns:
                    count = content.count(old_pattern)
                    if count > 0:
                        content = content.replace(old_pattern, new_pattern)
                        file_replacements += count
            
            if content != original_content:
                if not dry_run:
                    with open(json_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                updated_files += 1
                total_replacements += file_replacements
                print(f"  {'[将更新]' if dry_run else '[已更新]'} {json_file.name} ({file_replacements} 处)")
        
        except Exception as e:
            print(f"  错误: 更新 {json_file.name} 失败: {e}")
    
    return updated_files, total_replacements

def delete_files(files: list, dry_run: bool = True):
    """删除文件"""
    deleted = 0
    for filename in files:
        filepath = ICONS_DIR / filename
        if filepath.exists():
            if not dry_run:
                filepath.unlink()
            deleted += 1
    return deleted

def create_generic_icon(source_file: str, target_file: str, dry_run: bool = True):
    """创建通用图标"""
    source_path = ICONS_DIR / source_file
    target_path = ICONS_DIR / target_file
    
    if not source_path.exists():
        print(f"  警告: 源文件不存在 {source_file}")
        return False
    
    if target_path.exists():
        print(f"  通用图标已存在: {target_file}")
        return True
    
    if not dry_run:
        shutil.copy2(source_path, target_path)
        print(f"  创建通用图标: {target_file}")
    
    return True

# ==================== 主逻辑 ====================

def main():
    print("=" * 70)
    print("图标去重和引用更新程序 v3")
    print("=" * 70)
    print(f"模式: {'预览模式' if DRY_RUN else '执行模式'}")
    print()
    
    # 1. 分析图标
    print("[1] 分析图标文件...")
    hash_to_files, file_to_hash = analyze_icons()
    print(f"  总图标数: {len(file_to_hash)}")
    print(f"  唯一哈希数: {len(hash_to_files)}")
    
    # 2. 找出重复
    print("\n[2] 查找重复图标...")
    duplicates = {h: f for h, f in hash_to_files.items() if len(f) > 1}
    print(f"  重复组数: {len(duplicates)}")
    
    if duplicates:
        print("\n  重复组详情:")
        for h, files in list(duplicates.items())[:10]:
            print(f"    哈希 {h[:8]}... ({len(files)} 个文件)")
            for f in files[:3]:
                print(f"      - {f}")
            if len(files) > 3:
                print(f"      - ... 还有 {len(files) - 3} 个")
    
    # 3. 查找引用
    print("\n[3] 查找内容引用...")
    references = find_all_references()
    print(f"  被引用的图标: {len(references)}")
    
    # 4. 检查通用图标
    print("\n[4] 检查通用图标...")
    for icon_type, config in GENERIC_ICONS.items():
        filename = config['filename']
        filepath = ICONS_DIR / filename
        if filepath.exists():
            print(f"  ✓ {config['description']}: 已存在")
        else:
            print(f"  ✗ {config['description']}: 不存在")
    
    # 5. 生成替换方案
    print("\n[5] 生成替换方案...")
    replacements = {}
    files_to_delete = []
    
    for file_hash, files in duplicates.items():
        best_file = select_best_file(files, references)
        
        for file in files:
            if file != best_file:
                replacements[file] = best_file
                files_to_delete.append(file)
    
    print(f"  需要更新的引用: {len(replacements)}")
    print(f"  需要删除的文件: {len(files_to_delete)}")
    
    # 6. 显示替换详情
    if replacements:
        print("\n[6] 替换详情:")
        for old, new in list(replacements.items())[:15]:
            ref_count = len(references.get(old, []))
            print(f"  {old} -> {new} (引用: {ref_count})")
        if len(replacements) > 15:
            print(f"  ... 还有 {len(replacements) - 15} 个")
    
    # 7. 执行更新
    print("\n[7] 更新 JSON 引用...")
    updated_files, total_replacements = update_json_references(replacements, DRY_RUN)
    print(f"  {'将更新' if DRY_RUN else '已更新'} {updated_files} 个文件, {total_replacements} 处引用")
    
    # 8. 删除文件
    print("\n[8] 删除重复文件...")
    deleted = delete_files(files_to_delete, DRY_RUN)
    print(f"  {'将删除' if DRY_RUN else '已删除'} {deleted} 个文件")
    
    # 9. 处理未引用文件
    print("\n[9] 处理未引用文件...")
    all_files = set(file_to_hash.keys())
    referenced_files = set(references.keys())
    unreferenced = all_files - referenced_files - set(files_to_delete)
    
    # 排除通用图标
    for config in GENERIC_ICONS.values():
        if config['filename'] in unreferenced:
            unreferenced.remove(config['filename'])
    
    if unreferenced:
        print(f"  未引用文件: {len(unreferenced)}")
        for f in sorted(unreferenced)[:15]:
            print(f"    - {f}")
        if len(unreferenced) > 15:
            print(f"    - ... 还有 {len(unreferenced) - 15} 个")
    else:
        print("  没有未引用文件")
    
    # 10. 总结
    print("\n" + "=" * 70)
    print("总结")
    print("=" * 70)
    print(f"  原始图标数: {len(file_to_hash)}")
    print(f"  {'将删除' if DRY_RUN else '已删除'}重复: {deleted}")
    print(f"  未引用文件: {len(unreferenced)}")
    print(f"  最终图标数: {len(file_to_hash) - deleted}")
    
    # 11. 保存报告
    report = {
        'timestamp': datetime.now().isoformat(),
        'dry_run': DRY_RUN,
        'summary': {
            'original_count': len(file_to_hash),
            'unique_hashes': len(hash_to_files),
            'duplicate_groups': len(duplicates),
            'duplicates_deleted': deleted,
            'unreferenced_count': len(unreferenced),
            'final_count': len(file_to_hash) - deleted,
        },
        'duplicates': {h: f for h, f in duplicates.items()},
        'replacements': replacements,
        'files_deleted': files_to_delete,
        'unreferenced': list(unreferenced),
    }
    
    report_path = Path('./icon_dedupe_report.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n报告已保存: {report_path}")
    
    if DRY_RUN:
        print("\n" + "=" * 70)
        print("这是预览模式。要执行实际清理，请设置 DRY_RUN = False")
        print("=" * 70)

if __name__ == '__main__':
    main()
