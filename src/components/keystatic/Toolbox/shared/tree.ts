/**
 * 工具箱树形勾选的纯函数工具
 *
 * LinkChecker / GithubChecker 原先各自内联了一整套逐字相同的实现
 * （updateNodeStatus / setAllChildrenChecked / toggleNodeChecked /
 *  toggleNodeExpanded / 全选 / 统计选中），此处收敛为唯一实现。
 *
 * 约束：节点的勾选状态一律由 children 推导，调用方不要手写 checked，
 * 统一走 toggleNodeChecked / toggleSelectAll，它们最后会跑一遍 updateNodeStatus。
 */

export interface TreeLikeNode {
  id: string;
  type: string;
  name: string;
  checked: boolean;
  indeterminate: boolean;
  expanded: boolean;
  children?: TreeLikeNode[];
}

/** 由子节点状态反推父节点的 checked / indeterminate */
export function updateNodeStatus<T extends TreeLikeNode>(node: T): T {
  if (!node.children || node.children.length === 0) {
    return { ...node, indeterminate: false } as T;
  }

  const updatedChildren = node.children.map((child) => updateNodeStatus(child as T));
  const checkedCount = updatedChildren.filter((c) => c.checked).length;
  const indeterminateCount = updatedChildren.filter((c) => c.indeterminate).length;

  return {
    ...node,
    children: updatedChildren,
    checked: checkedCount === updatedChildren.length && checkedCount > 0,
    indeterminate: indeterminateCount > 0 || (checkedCount > 0 && checkedCount < updatedChildren.length),
  } as T;
}

/** 递归设置整棵子树的 checked */
export function setAllChildrenChecked<T extends TreeLikeNode>(node: T, checked: boolean): T {
  if (!node.children || node.children.length === 0) {
    return { ...node, checked, indeterminate: false } as T;
  }

  return {
    ...node,
    checked,
    indeterminate: false,
    children: node.children.map((child) => setAllChildrenChecked(child as T, checked)),
  } as T;
}

/** 切换某个节点的勾选（含整棵子树），并回算父级状态 */
export function toggleNodeChecked<T extends TreeLikeNode>(nodes: T[], nodeId: string): T[] {
  return nodes
    .map((node) => {
      if (node.id === nodeId) {
        return setAllChildrenChecked(node, !node.checked);
      }
      if (node.children) {
        return { ...node, children: toggleNodeChecked(node.children as T[], nodeId) } as T;
      }
      return node;
    })
    .map(updateNodeStatus);
}

/** 切换某个节点的展开状态 */
export function toggleNodeExpanded<T extends TreeLikeNode>(nodes: T[], nodeId: string): T[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return { ...node, expanded: !node.expanded } as T;
    }
    if (node.children) {
      return { ...node, children: toggleNodeExpanded(node.children as T[], nodeId) } as T;
    }
    return node;
  });
}

/** 全选 / 取消全选（按当前是否已全选取反） */
export function toggleSelectAll<T extends TreeLikeNode>(nodes: T[]): T[] {
  const allChecked = nodes.every((node) => node.checked);
  return nodes.map((node) => setAllChildrenChecked(node, !allChecked)).map(updateNodeStatus);
}

/** 收集所有勾选的资源节点载荷（pick 返回 undefined 表示该节点不计入） */
export function collectChecked<T extends TreeLikeNode, R>(nodes: T[], pick: (node: T) => R | undefined): R[] {
  const result: R[] = [];

  const traverse = (node: T) => {
    const picked = pick(node);
    if (picked !== undefined) result.push(picked);
    node.children?.forEach((child) => traverse(child as T));
  };

  nodes.forEach(traverse);
  return result;
}
