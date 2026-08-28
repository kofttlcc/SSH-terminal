import SwiftUI

public struct HostListView: View {
    @ObservedObject var appState: AppState

    public var body: some View {
        VStack(spacing: 0) {
            // Top Bar
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("主機管理與資產庫")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Text("管理已配置的 SSH 伺服器與 Console 設備")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }

                Spacer()

                // Add Host Button
                Button(action: {
                    appState.editingHost = nil
                    appState.hostEditModalOpen = true
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                        Text("新增主機")
                    }
                    .font(.system(size: 12, weight: .semibold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)

            // Search and Group Filter
            HStack(spacing: 12) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                        .font(.system(size: 12))
                    TextField("搜尋主機名稱、IP 或使用者...", text: $appState.hostSearchText)
                        .textFieldStyle(.plain)
                        .font(.system(size: 12))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(8)

                // Group Pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        GroupPillButton(title: "全部 (\(appState.vault.hosts.count))", active: appState.hostSelectedGroup == "all") {
                            appState.hostSelectedGroup = "all"
                        }

                        ForEach(appState.vault.groups) { grp in
                            GroupPillButton(title: grp.name, color: grp.color, active: appState.hostSelectedGroup == grp.id) {
                                appState.hostSelectedGroup = grp.id
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)

            Divider()
                .background(Color.gray.opacity(0.2))

            // Hosts Grid
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 280, maximum: 400), spacing: 14)], spacing: 14) {
                    ForEach(filteredHosts) { host in
                        HostCardView(host: host, onConnect: {
                            appState.openHostTerminal(host: host)
                        }, onEdit: {
                            appState.editingHost = host
                            appState.hostEditModalOpen = true
                        }, onDelete: {
                            appState.vault.hosts.removeAll(where: { $0.id == host.id })
                            appState.saveVault()
                            appState.addToast("info", "已刪除主機「\(host.label)」")
                        })
                    }
                }
                .padding(20)
            }
        }
        .background(Color(red: 9/255, green: 10/255, blue: 15/255))
    }

    private var filteredHosts: [HostItem] {
        appState.vault.hosts.filter { host in
            let matchesGroup = appState.hostSelectedGroup == "all" || host.group == appState.hostSelectedGroup
            if !appState.hostSearchText.isEmpty {
                let lower = appState.hostSearchText.lowercased()
                let matchesSearch = host.label.lowercased().contains(lower) ||
                                    host.hostname.lowercased().contains(lower) ||
                                    host.username.lowercased().contains(lower)
                return matchesGroup && matchesSearch
            }
            return matchesGroup
        }
    }
}

struct GroupPillButton: View {
    let title: String
    var color: String = "#3b82f6"
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 11, weight: active ? .semibold : .regular))
                .foregroundColor(active ? .white : .gray)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(active ? Color.blue.opacity(0.8) : Color(red: 20/255, green: 22/255, blue: 34/255))
                .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }
}
