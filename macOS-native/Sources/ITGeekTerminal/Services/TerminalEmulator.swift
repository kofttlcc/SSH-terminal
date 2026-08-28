import Foundation
import AppKit

public struct TerminalCell {
    public var char: Character = " "
    public var fg: NSColor = NSColor(red: 226/255.0, green: 232/255.0, blue: 240/255.0, alpha: 1.0)
    public var bg: NSColor = NSColor.clear
    public var bold: Bool = false
    public var underline: Bool = false

    public init(char: Character = " ", fg: NSColor = NSColor(red: 226/255.0, green: 232/255.0, blue: 240/255.0, alpha: 1.0), bg: NSColor = NSColor.clear, bold: Bool = false, underline: Bool = false) {
        self.char = char
        self.fg = fg
        self.bg = bg
        self.bold = bold
        self.underline = underline
    }
}

public class TerminalEmulator {
    public var cols: Int = 120
    public var rows: Int = 36

    public var cursorRow: Int = 0
    public var cursorCol: Int = 0
    public var savedCursorRow: Int = 0
    public var savedCursorCol: Int = 0
    public var cursorVisible: Bool = true

    // Current Style Attributes
    public var currentFg: NSColor = NSColor(red: 226/255.0, green: 232/255.0, blue: 240/255.0, alpha: 1.0)
    public var currentBg: NSColor = NSColor.clear
    public var currentBold: Bool = false
    public var currentUnderline: Bool = false

    // Screens
    public var screen: [[TerminalCell]]
    public var altScreen: [[TerminalCell]]? = nil
    public var isAltScreen: Bool = false
    public var scrollback: [[TerminalCell]] = []
    public let maxScrollback: Int = 3000

    // Parser State Machine
    private enum ParserState {
        case ground
        case escape
        case csi
        case osc
        case charset
    }
    private var state: ParserState = .ground
    private var csiParamString: String = ""
    private var csiIsPrivate: Bool = false
    private var oscString: String = ""

    private let defaultFg = NSColor(red: 226/255.0, green: 232/255.0, blue: 240/255.0, alpha: 1.0)
    private let defaultBg = NSColor.clear

    public init(cols: Int = 120, rows: Int = 36) {
        self.cols = cols
        self.rows = rows
        self.screen = Array(repeating: Array(repeating: TerminalCell(), count: cols), count: rows)
    }

    public func resize(cols: Int, rows: Int) {
        guard cols > 0 && rows > 0 else { return }
        self.cols = cols
        self.rows = rows

        var newScreen = Array(repeating: Array(repeating: TerminalCell(), count: cols), count: rows)
        for r in 0..<min(self.screen.count, rows) {
            for c in 0..<min(self.screen[r].count, cols) {
                newScreen[r][c] = self.screen[r][c]
            }
        }
        self.screen = newScreen
        self.cursorRow = min(self.cursorRow, rows - 1)
        self.cursorCol = min(self.cursorCol, cols - 1)
    }

    public func feed(data: Data) {
        let str = String(decoding: data, as: UTF8.self)
        for char in str {
            processCharacter(char)
        }
    }

    private func processCharacter(_ ch: Character) {
        switch state {
        case .ground:
            switch ch {
            case "\u{001B}": // ESC
                state = .escape
            case "\r": // Carriage Return
                cursorCol = 0
            case "\n", "\u{000B}", "\u{000C}": // Line Feed / VT / FF
                lineFeed()
            case "\u{0008}": // Backspace (BS)
                cursorCol = max(0, cursorCol - 1)
            case "\t": // Tab
                cursorCol = min(cols - 1, (cursorCol + 8) & ~7)
            case "\u{0007}": // BEL
                NSSound.beep()
            default:
                if ch >= " " {
                    putChar(ch)
                }
            }

        case .escape:
            switch ch {
            case "[":
                state = .csi
                csiParamString = ""
                csiIsPrivate = false
            case "]":
                state = .osc
                oscString = ""
            case "(", ")", "*", "+":
                state = .charset
            case "M": // Reverse Index (scroll down)
                if cursorRow == 0 {
                    scrollDown()
                } else {
                    cursorRow -= 1
                }
                state = .ground
            case "7": // Save Cursor
                savedCursorRow = cursorRow
                savedCursorCol = cursorCol
                state = .ground
            case "8": // Restore Cursor
                cursorRow = min(rows - 1, savedCursorRow)
                cursorCol = min(cols - 1, savedCursorCol)
                state = .ground
            case "c": // Reset Terminal
                reset()
                state = .ground
            default:
                state = .ground
            }

        case .csi:
            if ch == "?" {
                csiIsPrivate = true
            } else if (ch >= "0" && ch <= "9") || ch == ";" || ch == "?" {
                csiParamString.append(ch)
            } else if (ch >= "@" && ch <= "~") {
                executeCsi(command: ch)
                state = .ground
            } else {
                state = .ground
            }

        case .osc:
            if ch == "\u{0007}" || ch == "\u{001B}" {
                state = .ground
            } else {
                oscString.append(ch)
            }

        case .charset:
            state = .ground
        }
    }

    private func putChar(_ ch: Character) {
        if cursorCol >= cols {
            cursorCol = 0
            lineFeed()
        }
        if cursorRow >= rows {
            cursorRow = rows - 1
        }

        let cell = TerminalCell(
            char: ch,
            fg: currentFg,
            bg: currentBg,
            bold: currentBold,
            underline: currentUnderline
        )

        screen[cursorRow][cursorCol] = cell
        cursorCol += 1
    }

    private func lineFeed() {
        if cursorRow < rows - 1 {
            cursorRow += 1
        } else {
            // Scroll Up: Push top line to scrollback
            if !isAltScreen {
                scrollback.append(screen[0])
                if scrollback.count > maxScrollback {
                    scrollback.removeFirst()
                }
            }
            for r in 0..<rows - 1 {
                screen[r] = screen[r + 1]
            }
            screen[rows - 1] = Array(repeating: TerminalCell(), count: cols)
        }
    }

    private func scrollDown() {
        for r in (1..<rows).reversed() {
            screen[r] = screen[r - 1]
        }
        screen[0] = Array(repeating: TerminalCell(), count: cols)
    }

    private func executeCsi(command: Character) {
        let params = csiParamString.components(separatedBy: ";").compactMap { Int($0) }

        func param(_ index: Int, defaultVal: Int = 1) -> Int {
            if index < params.count && params[index] > 0 {
                return params[index]
            }
            return defaultVal
        }

        switch command {
        case "A": // Cursor Up
            cursorRow = max(0, cursorRow - param(0))
        case "B": // Cursor Down
            cursorRow = min(rows - 1, cursorRow + param(0))
        case "C": // Cursor Forward (Right)
            cursorCol = min(cols - 1, cursorCol + param(0))
        case "D": // Cursor Back (Left)
            cursorCol = max(0, cursorCol - param(0))
        case "E": // Cursor Next Line
            cursorRow = min(rows - 1, cursorRow + param(0))
            cursorCol = 0
        case "F": // Cursor Previous Line
            cursorRow = max(0, cursorRow - param(0))
            cursorCol = 0
        case "G", "`": // Cursor Horizontal Absolute
            cursorCol = max(0, min(cols - 1, param(0) - 1))
        case "d": // Cursor Vertical Absolute
            cursorRow = max(0, min(rows - 1, param(0) - 1))
        case "H", "f": // Cursor Position (row, col)
            cursorRow = max(0, min(rows - 1, param(0) - 1))
            cursorCol = max(0, min(cols - 1, param(1) - 1))

        case "J": // Erase in Display
            let mode = params.first ?? 0
            if mode == 0 { // Cursor to End
                for c in cursorCol..<cols { screen[cursorRow][c] = TerminalCell() }
                for r in (cursorRow + 1)..<rows {
                    screen[r] = Array(repeating: TerminalCell(), count: cols)
                }
            } else if mode == 1 { // Start to Cursor
                for r in 0..<cursorRow {
                    screen[r] = Array(repeating: TerminalCell(), count: cols)
                }
                for c in 0...cursorCol { screen[cursorRow][c] = TerminalCell() }
            } else if mode == 2 || mode == 3 { // Entire Screen
                for r in 0..<rows {
                    screen[r] = Array(repeating: TerminalCell(), count: cols)
                }
                if mode == 3 {
                    scrollback.removeAll()
                }
            }

        case "K": // Erase in Line
            let mode = params.first ?? 0
            if mode == 0 { // Cursor to End
                for c in cursorCol..<cols { screen[cursorRow][c] = TerminalCell() }
            } else if mode == 1 { // Start to Cursor
                for c in 0...cursorCol { screen[cursorRow][c] = TerminalCell() }
            } else if mode == 2 { // Entire Line
                screen[cursorRow] = Array(repeating: TerminalCell(), count: cols)
            }

        case "L": // Insert Line
            let count = param(0)
            for _ in 0..<count {
                for r in (cursorRow + 1..<rows).reversed() {
                    screen[r] = screen[r - 1]
                }
                screen[cursorRow] = Array(repeating: TerminalCell(), count: cols)
            }

        case "M": // Delete Line
            let count = param(0)
            for _ in 0..<count {
                for r in cursorRow..<rows - 1 {
                    screen[r] = screen[r + 1]
                }
                screen[rows - 1] = Array(repeating: TerminalCell(), count: cols)
            }

        case "P": // Delete Character
            let count = param(0)
            for _ in 0..<count {
                if cursorCol < cols - 1 {
                    for c in cursorCol..<cols - 1 {
                        screen[cursorRow][c] = screen[cursorRow][c + 1]
                    }
                    screen[cursorRow][cols - 1] = TerminalCell()
                }
            }

        case "@": // Insert Character
            let count = param(0)
            for _ in 0..<count {
                for c in (cursorCol + 1..<cols).reversed() {
                    screen[cursorRow][c] = screen[cursorRow][c - 1]
                }
                screen[cursorRow][cursorCol] = TerminalCell()
            }

        case "X": // Erase Character
            let count = param(0)
            for c in cursorCol..<min(cols, cursorCol + count) {
                screen[cursorRow][c] = TerminalCell()
            }

        case "s": // Save Cursor
            savedCursorRow = cursorRow
            savedCursorCol = cursorCol
        case "u": // Restore Cursor
            cursorRow = min(rows - 1, savedCursorRow)
            cursorCol = min(cols - 1, savedCursorCol)

        case "h": // Set Mode
            if csiIsPrivate {
                for p in params {
                    if p == 25 { cursorVisible = true }
                    if p == 1049 || p == 47 { enterAltScreen() }
                }
            }
        case "l": // Reset Mode
            if csiIsPrivate {
                for p in params {
                    if p == 25 { cursorVisible = false }
                    if p == 1049 || p == 47 { exitAltScreen() }
                }
            }

        case "m": // SGR (Select Graphic Rendition)
            handleSgr(params: params.isEmpty ? [0] : params)

        default:
            break
        }
    }

    private func enterAltScreen() {
        if !isAltScreen {
            altScreen = Array(repeating: Array(repeating: TerminalCell(), count: cols), count: rows)
            isAltScreen = true
        }
    }

    private func exitAltScreen() {
        if isAltScreen {
            altScreen = nil
            isAltScreen = false
        }
    }

    private func handleSgr(params: [Int]) {
        var idx = 0
        while idx < params.count {
            let code = params[idx]
            switch code {
            case 0:
                currentFg = defaultFg
                currentBg = defaultBg
                currentBold = false
                currentUnderline = false
            case 1:
                currentBold = true
            case 4:
                currentUnderline = true
            case 22:
                currentBold = false
            case 24:
                currentUnderline = false
            case 30...37:
                currentFg = ansi16Color(index: code - 30, bright: currentBold)
            case 39:
                currentFg = defaultFg
            case 40...47:
                currentBg = ansi16Color(index: code - 40, bright: false)
            case 49:
                currentBg = defaultBg
            case 90...97:
                currentFg = ansi16Color(index: code - 90, bright: true)
            case 100...107:
                currentBg = ansi16Color(index: code - 100, bright: true)
            case 38: // Extended FG color
                if idx + 2 < params.count && params[idx + 1] == 5 { // 256 color
                    let colorCode = params[idx + 2]
                    currentFg = color256(index: colorCode)
                    idx += 2
                } else if idx + 4 < params.count && params[idx + 1] == 2 { // 24-bit TrueColor
                    let r = CGFloat(params[idx + 2]) / 255.0
                    let g = CGFloat(params[idx + 3]) / 255.0
                    let b = CGFloat(params[idx + 4]) / 255.0
                    currentFg = NSColor(red: r, green: g, blue: b, alpha: 1.0)
                    idx += 4
                }
            case 48: // Extended BG color
                if idx + 2 < params.count && params[idx + 1] == 5 { // 256 color
                    let colorCode = params[idx + 2]
                    currentBg = color256(index: colorCode)
                    idx += 2
                } else if idx + 4 < params.count && params[idx + 1] == 2 { // 24-bit TrueColor
                    let r = CGFloat(params[idx + 2]) / 255.0
                    let g = CGFloat(params[idx + 3]) / 255.0
                    let b = CGFloat(params[idx + 4]) / 255.0
                    currentBg = NSColor(red: r, green: g, blue: b, alpha: 1.0)
                    idx += 4
                }
            default:
                break
            }
            idx += 1
        }
    }

    private func ansi16Color(index: Int, bright: Bool) -> NSColor {
        switch index {
        case 0: return bright ? NSColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1) : NSColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1) // Black / Bright Gray
        case 1: return bright ? NSColor(red: 248/255, green: 113/255, blue: 113/255, alpha: 1) : NSColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1) // Red
        case 2: return bright ? NSColor(red: 74/255, green: 222/255, blue: 128/255, alpha: 1) : NSColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1) // Green
        case 3: return bright ? NSColor(red: 250/255, green: 204/255, blue: 21/255, alpha: 1) : NSColor(red: 234/255, green: 179/255, blue: 8/255, alpha: 1) // Yellow
        case 4: return bright ? NSColor(red: 96/255, green: 165/255, blue: 250/255, alpha: 1) : NSColor(red: 59/255, green: 130/255, blue: 246/255, alpha: 1) // Blue
        case 5: return bright ? NSColor(red: 216/255, green: 180/255, blue: 254/255, alpha: 1) : NSColor(red: 168/255, green: 85/255, blue: 247/255, alpha: 1) // Magenta
        case 6: return bright ? NSColor(red: 103/255, green: 232/255, blue: 249/255, alpha: 1) : NSColor(red: 6/255, green: 182/255, blue: 212/255, alpha: 1) // Cyan
        case 7: return bright ? NSColor(red: 255/255, green: 255/255, blue: 255/255, alpha: 1) : NSColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1) // White
        default: return defaultFg
        }
    }

    private func color256(index: Int) -> NSColor {
        if index < 16 {
            return ansi16Color(index: index % 8, bright: index >= 8)
        } else if index >= 232 { // Grayscale 232..255
            let level = CGFloat(index - 232) / 23.0 * 0.9 + 0.05
            return NSColor(white: level, alpha: 1.0)
        } else { // 6x6x6 color cube (16..231)
            let i = index - 16
            let b = CGFloat(i % 6) / 5.0
            let g = CGFloat((i / 6) % 6) / 5.0
            let r = CGFloat(i / 36) / 5.0
            return NSColor(red: r, green: g, blue: b, alpha: 1.0)
        }
    }

    public func reset() {
        cursorRow = 0
        cursorCol = 0
        currentFg = defaultFg
        currentBg = defaultBg
        currentBold = false
        currentUnderline = false
        screen = Array(repeating: Array(repeating: TerminalCell(), count: cols), count: rows)
        scrollback.removeAll()
    }

    public struct RenderResult {
        public let attributedString: NSAttributedString
        public let cursorCharIndex: Int
        public let cursorLine: Int
        public let cursorColumn: Int
    }

    public func render() -> RenderResult {
        let result = NSMutableAttributedString()
        var cursorLocation: Int = 0

        let fontRegular = NSFont.monospacedSystemFont(ofSize: 13.0, weight: .regular)
        let fontBold = NSFont.monospacedSystemFont(ofSize: 13.0, weight: .bold)

        // 1. Render Scrollback lines
        for line in scrollback {
            var trimmedLen = line.count
            while trimmedLen > 0 && line[trimmedLen - 1].char == " " && line[trimmedLen - 1].bg == NSColor.clear {
                trimmedLen -= 1
            }
            if trimmedLen == 0 {
                result.append(NSAttributedString(string: "\n", attributes: [.font: fontRegular, .foregroundColor: defaultFg]))
            } else {
                for c in 0..<trimmedLen {
                    let cell = line[c]
                    let attrs: [NSAttributedString.Key: Any] = [
                        .font: cell.bold ? fontBold : fontRegular,
                        .foregroundColor: cell.fg,
                        .backgroundColor: cell.bg,
                        .underlineStyle: cell.underline ? NSUnderlineStyle.single.rawValue : 0
                    ]
                    result.append(NSAttributedString(string: String(cell.char), attributes: attrs))
                }
                result.append(NSAttributedString(string: "\n", attributes: [.font: fontRegular, .foregroundColor: defaultFg]))
            }
        }

        // 2. Render Active Screen lines and compute exact cursor character index
        let totalActiveRows = rows
        for r in 0..<totalActiveRows {
            let line = screen[r]
            
            // Trim trailing blank spaces for clean layout, but preserve spaces before cursor
            var maxCol = line.count
            while maxCol > 0 && line[maxCol - 1].char == " " && line[maxCol - 1].bg == NSColor.clear {
                maxCol -= 1
            }
            if r == cursorRow {
                maxCol = max(maxCol, cursorCol)
            }

            for c in 0..<maxCol {
                if r == cursorRow && c == cursorCol {
                    cursorLocation = result.length
                }
                let cell = (c < line.count) ? line[c] : TerminalCell()
                let attrs: [NSAttributedString.Key: Any] = [
                    .font: cell.bold ? fontBold : fontRegular,
                    .foregroundColor: cell.fg,
                    .backgroundColor: cell.bg,
                    .underlineStyle: cell.underline ? NSUnderlineStyle.single.rawValue : 0
                ]
                result.append(NSAttributedString(string: String(cell.char), attributes: attrs))
            }

            if r == cursorRow && cursorCol >= maxCol {
                cursorLocation = result.length
            }

            if r < totalActiveRows - 1 {
                result.append(NSAttributedString(string: "\n", attributes: [.font: fontRegular, .foregroundColor: defaultFg]))
            }
        }

        return RenderResult(
            attributedString: result,
            cursorCharIndex: cursorLocation,
            cursorLine: scrollback.count + cursorRow,
            cursorColumn: cursorCol
        )
    }
}
