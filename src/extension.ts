import * as vscode from 'vscode'
import SymbolKinds from './SymbolKinds'

const restrictForContainers = [
  vscode.SymbolKind.Method,
  vscode.SymbolKind.Property,
  vscode.SymbolKind.Struct,
  vscode.SymbolKind.Function,
  vscode.SymbolKind.EnumMember,
  vscode.SymbolKind.Enum,
  vscode.SymbolKind.Constructor,
  vscode.SymbolKind.Class,
  vscode.SymbolKind.Namespace
]

const containers = [
  vscode.SymbolKind.Class,
  vscode.SymbolKind.Struct,
  vscode.SymbolKind.Enum,
  vscode.SymbolKind.Interface,
  vscode.SymbolKind.Namespace,
  vscode.SymbolKind.TypeParameter
]

const disallowRecurse = [
  vscode.SymbolKind.Function,
  vscode.SymbolKind.Method,
]

// Before, After
const smap: Record<vscode.SymbolKind, Array<string>> = {
  [vscode.SymbolKind.Module]: ["module", ""],
  [vscode.SymbolKind.Array]: ["var", "[]"],
  [vscode.SymbolKind.Boolean]: ["var", ""],
  [vscode.SymbolKind.Class]: ["class", ""],
  [vscode.SymbolKind.Constant]: ["const", ""],
  [vscode.SymbolKind.Constructor]: ["", "(...)"],
  [vscode.SymbolKind.Enum]: ["enum", ""],
  [vscode.SymbolKind.EnumMember]: ["", ""],
  [vscode.SymbolKind.Event]: ["event", ""],
  [vscode.SymbolKind.Field]: ["field", ""],
  [vscode.SymbolKind.File]: ["file", ""],
  [vscode.SymbolKind.Function]: ["function", ""],
  [vscode.SymbolKind.Interface]: ["interface", ""],
  [vscode.SymbolKind.Key]: ["key", ""],
  [vscode.SymbolKind.Method]: ["function", ""],
  [vscode.SymbolKind.Namespace]: ["function ", ""],
  [vscode.SymbolKind.Null]: ["null", ""],
  [vscode.SymbolKind.Number]: ["number", ""],
  [vscode.SymbolKind.Object]: ["object", ""],
  [vscode.SymbolKind.Operator]: ["op", ""],
  [vscode.SymbolKind.Package]: ["pkg", ""],
  [vscode.SymbolKind.Property]: ["", ""],
  [vscode.SymbolKind.String]: ["string", ""],
  [vscode.SymbolKind.TypeParameter]: ["type", ""],
  [vscode.SymbolKind.String]: ["string", ""],
  [vscode.SymbolKind.Struct]: ["struct", ""],
  [vscode.SymbolKind.Variable]: ["var", ""],
}

function processNodes(
  symbols: vscode.DocumentSymbol[],
  depth: number,
  isOuterContainer: boolean = false,
  simple: boolean,
  classOnly: boolean = false
): string {
  let result = ""
  for (const symbol of symbols) {
    const tabs = [...new Array(depth)].reduce((a, b) => a + '\t', '')
    if (!isOuterContainer || (isOuterContainer && restrictForContainers.includes(symbol.kind))) {
      let res = `${tabs}${smap[symbol.kind][0]} ${symbol.name}${smap[symbol.kind][1]}\n`
      if (!res.includes("<unknown>")) {
        if (classOnly && depth === 0) {
          if (containers.includes(symbol.kind)) {
            result += res;
          }
        } else {
          result += res;
        }
      }
    }
    let canRecurse = true
    if (simple) {
      canRecurse = !disallowRecurse.includes(symbol.kind)
    }
    if (symbol.children && canRecurse) {
      let substr = processNodes(symbol.children, depth + 1, containers.includes(symbol.kind), simple, classOnly)
      if (substr) {
        if (!substr.includes("<unknown>")) {
          let new_result = result.slice(0, -1) + " {\n"
          new_result += substr
          new_result += `${tabs}}\n`
          result = new_result
        }
      }
    }
  }
  return result
}

function doStuff(simple: boolean = false, classOnly: boolean = false) {

  if (!vscode.window.activeTextEditor) {
    vscode.window.showWarningMessage('There must be an active text editor')
    return
  }
  (vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', vscode.Uri.file(vscode.window.activeTextEditor.document.fileName)) as Thenable<vscode.DocumentSymbol[]>)
    .then((symbols: vscode.DocumentSymbol[]) => {
      let text = "```js\n\n"
      text += processNodes(symbols, 0, false, simple, classOnly)
      text += "\n\n```"
      vscode.workspace.openTextDocument({ content: text }).then(doc => {
        vscode.window.showTextDocument(doc)
      })
    })
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.listSymbols', () => {
    doStuff()
  })

  const disposable2 = vscode.commands.registerCommand('extension.listSymbolsSimple', () => {
    doStuff(true)
  })

  const disposable3 = vscode.commands.registerCommand('extension.listSymbolsSimpleClassOnly', () => {
    doStuff(true, true)
  })
  context.subscriptions.push(disposable)
  context.subscriptions.push(disposable2)
  context.subscriptions.push(disposable3)
}
