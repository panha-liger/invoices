export default function AccountBadge({ name }: { name: string }) {
  const isReAI = name === 'RE:AI'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 9px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: isReAI ? '#F0FDFA' : '#FDF4FF',
      color:      isReAI ? '#0F766E' : '#86198F',
      border:     `1px solid ${isReAI ? '#99F6E4' : '#E9D5FF'}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isReAI ? '#00B4B4' : '#EC4899', display: 'inline-block', flexShrink: 0 }} />
      {name}
    </span>
  )
}
