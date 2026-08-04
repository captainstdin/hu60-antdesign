export function mapForumTree(items = [], parents = []) {
  return items.map((item) => {
    const path = [...parents, item.name].filter(Boolean)
    const disabled = Number(item.notopic) === 1
    return {
      value: String(item.id),
      label: path.join(' / '),
      title: item.name,
      selectable: !disabled,
      children: mapForumTree(item.child || item.children || [], path),
    }
  })
}
