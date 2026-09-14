/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/gitcortexStudioShell.css';
import { $, addDisposableListener, append, clearNode, Dimension, getWindow, scheduleAtNextAnimationFrame } from '../../../../base/browser/dom.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorOpenContext, IEditorSerializer } from '../../../common/editor.js';
import { SIDE_BAR_FOREGROUND } from '../../../common/theme.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { IWorkbenchLayoutService, Parts } from '../../../services/layout/browser/layoutService.js';
import { ChatAgentLocation, ChatModeKind } from '../../chat/common/constants.js';
import { ChatWidget } from '../../chat/browser/widget/chatWidget.js';
import { IChatWidgetViewOptions } from '../../chat/browser/chat.js';
import { IChatService } from '../../chat/common/chatService/chatService.js';
import { IChatModel } from '../../chat/common/model/chatModel.js';
import { IVirtualMachinesService, IVirtualMachineInfo, VirtualMachineState } from '../../../../platform/virtualMachines/common/virtualMachines.js';
import { IWebviewElement, IWebviewService } from '../../webview/browser/webview.js';
import { FileAccess } from '../../../../base/common/network.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { asWebviewUri, webviewGenericCspSource } from '../../webview/common/webview.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { GitCortexStudioShellInput, GitCortexStudioShellEditorOptions } from './gitcortexStudioShellInput.js';
import { GitCortexShellConfiguration } from '../common/shellConfiguration.js';
import { SplitViewState, chatHeightForState, clampChatRatio, deserializeSplitViewState, serializeSplitViewState, SPLIT_MAX_CHAT_RATIO, SPLIT_MIN_CHAT_RATIO } from '../common/splitView.js';

const NOVNC_ROOT = 'vs/workbench/contrib/virtualMachines/browser/media/novnc';
const SHELL_SPLIT_STATE_KEY = 'gitcortex.studioShell.splitState';
const NAV_ITEM_ICONS: Record<ShellSurface, ThemeIcon> = {
	chat: Codicon.commentDiscussion,
	vm: Codicon.vm,
	sessions: Codicon.history,
	projects: Codicon.folderOpened,
	mcp: Codicon.serverProcess,
	developer: Codicon.extensions,
};

type ShellSurface = 'chat' | 'vm' | 'sessions' | 'projects' | 'mcp' | 'developer';

const SURFACE_LABELS: Record<ShellSurface, string> = {
	chat: localize('gitcortex.shell.surface.chat', "Chat"),
	vm: localize('gitcortex.shell.surface.vm', "Machines virtuelles"),
	sessions: localize('gitcortex.shell.surface.sessions', "Sessions"),
	projects: localize('gitcortex.shell.surface.projects', "Projets"),
	mcp: localize('gitcortex.shell.surface.mcp', "MCP"),
	developer: localize('gitcortex.shell.surface.developer', "Mode développeur"),
};

export class GitCortexStudioShellPage extends EditorPane {

	static readonly ID = 'gitcortexStudioShellPage';
	static readonly COMMAND_ID = 'workbench.action.openGitCortexStudioShell';

	private container!: HTMLElement;
	private contentContainer!: HTMLElement;
	private chatContainer!: HTMLElement;
	private vmSurface!: HTMLElement;
	private vmWebviewHost: HTMLElement | undefined;
	private splitDivider!: HTMLElement;
	private readonly navItems = new Map<ShellSurface, HTMLElement>();
	private chatWidget: ChatWidget | undefined;
	private chatModelRef: { dispose(): void; object: IChatModel | undefined } | undefined;
	private vmWebview: IWebviewElement | undefined;
	private readonly contentDisposables = this._register(new DisposableStore());
	private readonly vmDisposables = this._register(new DisposableStore());
	private currentSurface: ShellSurface = 'chat';
	private splitState: SplitViewState;
	private lastDimension: Dimension | undefined;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService protected readonly storageService: IStorageService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService,
		@ICommandService private readonly commandService: ICommandService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IProductService private readonly productService: IProductService,
		@IChatService private readonly chatService: IChatService,
		@IVirtualMachinesService private readonly virtualMachinesService: IVirtualMachinesService,
		@IWebviewService private readonly webviewService: IWebviewService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {
		super(GitCortexStudioShellPage.ID, group, telemetryService, themeService, storageService);

		this.splitState = deserializeSplitViewState(storageService.get(SHELL_SPLIT_STATE_KEY, StorageScope.WORKSPACE));

		this.container = $('.gitcortex-studio-shell', {
			role: 'document',
			tabindex: 0,
			'aria-label': localize('gitcortexStudioShellAriaLabel', "GitCortex Studio desktop shell")
		});

		this._register(this.virtualMachinesService.onDidChangeVirtualMachines(() => {
			this.renderVmSurface().catch(() => { /* service errors are surface-checked */ });
		}));
	}

	protected createEditor(parent: HTMLElement): void {
		parent.appendChild(this.container);
		this.container.style.height = '100%';
		this.container.style.width = '100%';
	}

	override async setInput(input: GitCortexStudioShellInput, options: GitCortexStudioShellEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		this.applyClassicPartsVisibility();
		this.buildContent();
		await this.renderVmSurface();
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(GitCortexShellConfiguration.DeveloperMode)) {
				this.applyClassicPartsVisibility();
				this.buildContent();
			}
		}));
	}

	override clearInput(): void {
		this.contentDisposables.clear();
		clearNode(this.container);
		// Restore classic parts when leaving the Studio shell (e.g. developer mode file editing).
		this.layoutService.setPartHidden(false, Parts.ACTIVITYBAR_PART);
		this.layoutService.setPartHidden(false, Parts.SIDEBAR_PART);
		this.layoutService.setPartHidden(false, Parts.PANEL_PART);
		this.layoutService.setPartHidden(false, Parts.AUXILIARYBAR_PART);
		super.clearInput();
	}

	/**
	 * The Studio shell is the primary surface. The classic Code-OSS workbench
	 * parts stay available but are hidden by default; Developer Mode re-exposes
	 * them as the "advanced tools" space.
	 */
	private applyClassicPartsVisibility(): void {
		const developerMode = this.configurationService.getValue<boolean>(GitCortexShellConfiguration.DeveloperMode);
		const hidden = !developerMode;
		this.layoutService.setPartHidden(hidden, Parts.ACTIVITYBAR_PART);
		this.layoutService.setPartHidden(hidden, Parts.SIDEBAR_PART);
		this.layoutService.setPartHidden(hidden, Parts.PANEL_PART);
		this.layoutService.setPartHidden(hidden, Parts.AUXILIARYBAR_PART);
	}

	//#region Shell frame

	private buildContent(): void {
		clearNode(this.container);

		this.buildNavigation();

		this.contentContainer = append(this.container, $('.gitcortex-studio-shell-content'));
		this.setSurface(this.currentSurface);
	}

	private buildNavigation(): void {
		const rail = append(this.container, $('nav.gitcortex-studio-shell-navigation'));
		rail.setAttribute('aria-label', localize('gitcortex.shell.navAria', "Navigation"));

		const brand = append(rail, $('div.gitcortex-studio-shell-brand'));
		brand.textContent = this.productService.nameShort;
		brand.title = this.productService.nameLong;

		const items: { id: ShellSurface; label: string }[] = [
			{ id: 'chat', label: SURFACE_LABELS.chat },
			{ id: 'vm', label: SURFACE_LABELS.vm },
			{ id: 'sessions', label: SURFACE_LABELS.sessions },
			{ id: 'projects', label: SURFACE_LABELS.projects },
			{ id: 'mcp', label: SURFACE_LABELS.mcp },
			{ id: 'developer', label: SURFACE_LABELS.developer },
		];

		for (const item of items) {
			const button = append(rail, $('button.gitcortex-studio-shell-nav-item'));
			button.appendChild(renderIcon(NAV_ITEM_ICONS[item.id]));
			append(button, $('span.gitcortex-studio-shell-nav-item-label', {}, item.label));
			button.setAttribute('aria-label', item.label);
			button.title = item.label;
			this.navItems.set(item.id, button);
			this.contentDisposables.add(addDisposableListener(button, 'click', () => this.setSurface(item.id)));
		}
	}

	private setSurface(surface: ShellSurface): void {
		this.currentSurface = surface;
		for (const [id, el] of this.navItems) {
			const active = id === surface;
			el.classList.toggle('active', active);
			if (active) {
				el.setAttribute('aria-current', 'page');
			} else {
				el.removeAttribute('aria-current');
			}
		}

		clearNode(this.contentContainer);
		this.vmDisposables.clear();

		if (surface === 'chat' || surface === 'vm') {
			this.contentContainer.classList.remove('surface-single');
			this.buildSplit();
		} else {
			this.contentContainer.classList.add('surface-single');
			this.renderSingleSurface(surface);
		}

		// Layout after frame is mounted
		this.layout(this.lastDimension ?? new Dimension(this.container.clientWidth, this.container.clientHeight));
	}

	//#endregion

	//#region Split layout (chat above VM)

	private buildSplit(): void {
		this.contentContainer.classList.add('shell-split');

		this.chatContainer = append(this.contentContainer, $('.gitcortex-studio-shell-chat'));
		this.splitDivider = append(this.contentContainer, $('.gitcortex-studio-shell-divider'));
		this.splitDivider.tabIndex = 0;
		this.splitDivider.setAttribute('role', 'separator');
		this.splitDivider.setAttribute('aria-orientation', 'horizontal');
		this.splitDivider.setAttribute('aria-label', localize('gitcortex.shell.divider', "Séparateur entre le chat et la machine virtuelle"));
		this.vmSurface = append(this.contentContainer, $('.gitcortex-studio-shell-vm'));

		this.ensureChatWidget();
		this.applySplitRatio();
		this.renderVmSurface().catch(() => { /* handled in render */ });

		// Mouse resize
		this.contentDisposables.add(addDisposableListener(this.splitDivider, 'pointerdown', (e: PointerEvent) => {
			e.preventDefault();
			const container = this.contentContainer;
			const startY = e.clientY;
			const startHeight = Math.max(1, container.clientHeight);
			const startRatio = this.splitState.chatRatio;

			const targetDocument = this.splitDivider.ownerDocument;
			const onMove = (moveEvent: PointerEvent) => {
				const delta = moveEvent.clientY - startY;
				this.splitState = { chatRatio: clampChatRatio(startRatio + delta / startHeight) };
				this.applySplitRatio();
				this.persistSplitState();
			};
			const onUp = () => {
				targetDocument.removeEventListener('pointermove', onMove);
				targetDocument.removeEventListener('pointerup', onUp);
			};
			targetDocument.addEventListener('pointermove', onMove);
			targetDocument.addEventListener('pointerup', onUp);
		}));

		// Keyboard resize
		this.contentDisposables.add(addDisposableListener(this.splitDivider, 'keydown', (e: KeyboardEvent) => {
			let nextRatio = this.splitState.chatRatio;
			if (e.key === 'ArrowUp') {
				nextRatio = clampChatRatio(nextRatio + 0.05);
			} else if (e.key === 'ArrowDown') {
				nextRatio = clampChatRatio(nextRatio - 0.05);
			} else if (e.key === 'Home') {
				nextRatio = SPLIT_MIN_CHAT_RATIO;
			} else if (e.key === 'End') {
				nextRatio = SPLIT_MAX_CHAT_RATIO;
			} else {
				return;
			}
			e.preventDefault();
			this.splitState = { chatRatio: nextRatio };
			this.applySplitRatio();
			this.persistSplitState();
		}));
	}

	private applySplitRatio(): void {
		if (!this.chatContainer || !this.vmSurface) {
			return;
		}
		const ratio = this.splitState.chatRatio;
		this.chatContainer.style.height = `calc(${ratio * 100}% - 4px)`;
		this.vmSurface.style.height = `calc(${(1 - ratio) * 100}% - 4px)`;
		this.layoutChatWidget();
		this.layoutVmWebview();
	}

	private persistSplitState(): void {
		this.storageService.store(SHELL_SPLIT_STATE_KEY, serializeSplitViewState(this.splitState), StorageScope.WORKSPACE, StorageTarget.USER);
	}

	//#endregion

	//#region Chat widget

	private ensureChatWidget(): void {
		if (this.chatWidget) {
			return;
		}
		const chatWidgetContainer = append(this.chatContainer, $('.gitcortex-studio-shell-chat-widget'));

		const editorOverflowWidgetsDomNode = this.layoutService.getContainer(getWindow(chatWidgetContainer)).appendChild($('.chat-editor-overflow.monaco-editor'));
		this.contentDisposables.add({ dispose: () => editorOverflowWidgetsDomNode.remove() });

		const scopedContextKeyService = this.contentDisposables.add(this.contextKeyService.createScoped(this.container));
		const scopedInstantiationService = this.contentDisposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService])));

		const viewOptions: IChatWidgetViewOptions = {
			autoScroll: mode => mode !== ChatModeKind.Ask,
			renderFollowups: false,
			supportsFileReferences: true,
			renderInputOnTop: true,
			rendererOptions: {
				renderTextEditsAsSummary: () => true,
				referencesExpandedWhenEmptyResponse: false,
				progressMessageAtBottomOfResponse: mode => mode !== ChatModeKind.Ask,
			},
			editorOverflowWidgetsDomNode,
			enableImplicitContext: true,
			enableWorkingSet: 'explicit',
			supportsChangingModes: true,
		};

		this.chatWidget = this.contentDisposables.add(scopedInstantiationService.createInstance(
			ChatWidget,
			ChatAgentLocation.Chat,
			{},
			viewOptions,
			{
				listForeground: SIDE_BAR_FOREGROUND,
				listBackground: editorBackground,
				overlayBackground: editorBackground,
				inputEditorBackground: editorBackground,
				resultEditorBackground: editorBackground,
			}
		));

		this.chatWidget.render(chatWidgetContainer);
		this.chatWidget.setVisible(true);

		this.chatModelRef = this.chatService.startNewLocalSession(ChatAgentLocation.Chat);
		this.contentDisposables.add(this.chatModelRef);
		if (this.chatModelRef.object) {
			this.chatWidget.setModel(this.chatModelRef.object);
		}

		this.contentDisposables.add(scheduleAtNextAnimationFrame(getWindow(chatWidgetContainer), () => {
			this.layoutChatWidget();
		}));
	}

	//#endregion

	//#region VM surface

	private async renderVmSurface(): Promise<void> {
		if (!this.vmSurface) {
			return;
		}
		this.vmDisposables.clear();
		clearNode(this.vmSurface);

		let vms: readonly IVirtualMachineInfo[] = [];
		try {
			vms = await this.virtualMachinesService.getVirtualMachines();
		} catch {
			this.renderVmMessage(localize('gitcortex.shell.vm.unavailable', "Machines virtuelles indisponibles."));
			return;
		}

		if (vms.length === 0) {
			this.renderVmMessage(localize('gitcortex.shell.vm.empty', "Aucune machine virtuelle configurée."));
			return;
		}

		const running = vms.find(v => v.state === VirtualMachineState.Running);
		const starting = vms.find(v => v.state === VirtualMachineState.Starting || v.state === VirtualMachineState.Stopping);
		const stopped = vms.find(v => v.state === VirtualMachineState.Stopped || v.state === VirtualMachineState.Error);

		const header = append(this.vmSurface, $('.gitcortex-studio-shell-vm-header'));
		append(header, $('span.gitcortex-studio-shell-vm-title', {}, running?.name ?? starting?.name ?? stopped?.name ?? ''));
		const stateLabel = append(header, $('span.gitcortex-studio-shell-vm-state', {}, running?.state ?? starting?.state ?? stopped?.state ?? ''));
		stateLabel.classList.add(`state-${running?.state ?? starting?.state ?? stopped?.state ?? 'stopped'}`);

		const body = append(this.vmSurface, $('.gitcortex-studio-shell-vm-body'));

		if (running) {
			try {
				const display = await this.virtualMachinesService.openDisplay(running.id);
				this.mountVmDisplay(body, display.webSocketUrl, display.token);
			} catch {
				this.appendVmMessage(body, localize('gitcortex.shell.vm.openFailed', "Impossible d'ouvrir l'écran distant."));
			}
		} else if (starting) {
			this.appendVmMessage(body, localize('gitcortex.shell.vm.busy', "Préparation de la machine…"));
		} else if (stopped) {
			const actions = append(body, $('.gitcortex-studio-shell-vm-actions'));
			const start = append(actions, $('button.gitcortex-studio-shell-primary-button'));
			start.textContent = localize('gitcortex.shell.vm.start', "Démarrer");
			this.vmDisposables.add(addDisposableListener(start, 'click', () => {
				void this.virtualMachinesService.start(stopped.id);
			}));
			if (stopped.error) {
				this.appendVmMessage(body, stopped.error);
			}
		} else {
			this.appendVmMessage(body, localize('gitcortex.shell.vm.none', "Aucune machine à afficher."));
		}
	}

	private renderVmMessage(message: string): void {
		append(this.vmSurface, $('.gitcortex-studio-shell-vm-message', {}, message));
	}

	private appendVmMessage(container: HTMLElement, message: string): void {
		append(container, $('.gitcortex-studio-shell-vm-message', {}, message));
	}

	private mountVmDisplay(container: HTMLElement, webSocketUrl: string, token: string): void {
		const host = append(container, $('.gitcortex-studio-shell-vm-webview-host'));
		host.style.height = '100%';
		this.vmWebviewHost = host;

		try {
			const webview = this.webviewService.createWebviewElement({
				providedViewType: 'gitcortex.studioShell.vmConsole',
				title: localize('gitcortex.shell.vm.console', "Console de machine virtuelle"),
				options: {},
				contentOptions: {
					allowScripts: true,
					localResourceRoots: [FileAccess.asFileUri(NOVNC_ROOT)],
				},
				extension: undefined,
			});
			this.vmWebview = webview;
			webview.mountTo(host, getWindow(this.container));
			webview.setHtml(this.renderVmHtml(webSocketUrl, token));
			this.vmDisposables.add(webview);
			this.layoutVmWebview();
		} catch {
			this.appendVmMessage(container, localize('gitcortex.shell.vm.webviewFailed', "La console ne peut pas être affichée ici."));
		}
	}

	private renderVmHtml(webSocketUrl: string, token: string): string {
		const rfbUri = asWebviewUri(FileAccess.asFileUri(`${NOVNC_ROOT}/core/rfb.js`));
		const cspSource = webviewGenericCspSource;
		const nonce = generateUuid().replace(/-/g, '');
		const connectUrl = JSON.stringify(webSocketUrl);
		const tokenValue = JSON.stringify(token);

		return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src ${cspSource} ws://127.0.0.1:*; script-src ${cspSource} 'nonce-${nonce}'; style-src ${cspSource} 'nonce-${nonce}'; img-src ${cspSource} data:; font-src ${cspSource};">
	<style nonce="${nonce}">
		html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; background: transparent; }
		#screen { width: 100%; height: 100%; }
		#status { position: absolute; top: 8px; left: 8px; padding: 4px 10px; font: 12px sans-serif; color: var(--vscode-widget-foreground, inherit); background: var(--vscode-widget-background, transparent); border: 1px solid var(--vscode-widget-border, transparent); border-radius: 4px; z-index: 10; }
	</style>
</head>
<body>
	<div id="status" role="status" aria-live="polite">Connexion…</div>
	<div id="screen" role="application"></div>
	<script type="module" nonce="${nonce}">
		import RFB from ${JSON.stringify(rfbUri.toString(true))};
		const status = document.getElementById('status');
		const screen = document.getElementById('screen');
		const rfb = new RFB(screen, ${connectUrl}, { wsProtocols: ['binary', ${tokenValue}] });
		rfb.scaleViewport = true;
		rfb.resizeSession = true;
		rfb.addEventListener('connect', () => { status.style.display = 'none'; });
		rfb.addEventListener('disconnect', e => {
			status.style.display = '';
			status.textContent = e.detail.clean ? 'Session terminée.' : 'Connexion perdue avec la machine virtuelle.';
		});
		rfb.addEventListener('securityfailure', e => {
			status.style.display = '';
			status.textContent = 'VNC security failure: ' + (e.detail.reason || e.detail.status);
		});
	</script>
</body>
</html>`;
	}

	//#endregion

	//#region Single surfaces

	private renderSingleSurface(surface: ShellSurface): void {
		clearNode(this.contentContainer);
		if (surface === 'projects') {
			this.renderProjectsSurface();
		} else if (surface === 'sessions') {
			this.renderSessionsSurface();
		} else if (surface === 'mcp') {
			this.renderMcpSurface();
		} else if (surface === 'developer') {
			this.renderDeveloperSurface();
		}
	}

	private section(): HTMLElement {
		const section = append(this.contentContainer, $('.gitcortex-studio-shell-section'));
		return section;
	}

	private renderProjectsSurface(): void {
		const section = this.section();
		append(section, $('h2.gitcortex-studio-shell-section-title', {}, SURFACE_LABELS.projects));

		const openFolder = append(section, $('button.gitcortex-studio-shell-command-button'));
		openFolder.textContent = localize('gitcortex.shell.openFolder', "Ouvrir un dossier");
		this.contentDisposables.add(addDisposableListener(openFolder, 'click', () => {
			void this.commandService.executeCommand('workbench.action.files.openFolder');
		}));

		const workspace = this.workspaceContextService.getWorkspace();
		if (workspace && workspace.folders.length > 0) {
			append(section, $('.gitcortex-studio-shell-current-workspace', {}, workspace.folders.map(f => f.name).join(', ')));
		}
	}

	private renderSessionsSurface(): void {
		const section = this.section();
		append(section, $('h2.gitcortex-studio-shell-section-title', {}, SURFACE_LABELS.sessions));
		void this.chatService.getLiveSessionItems().then(items => {
			const list = append(section, $('.gitcortex-studio-shell-session-list'));
			if (items.length === 0) {
				append(list, $('.gitcortex-studio-shell-vm-message', {}, localize('gitcortex.shell.sessions.empty', "Aucune session récente.")));
				return;
			}
			for (const item of items) {
				const row = append(list, $('button.gitcortex-studio-shell-session-row'));
				row.textContent = item.title || item.sessionResource.path;
				this.contentDisposables.add(addDisposableListener(row, 'click', () => {
					this.chatService.acquireOrLoadSession(item.sessionResource, ChatAgentLocation.Chat, CancellationToken.None)
						.then(ref => {
							if (ref) {
								this.setSurface('chat');
								if (this.chatWidget) {
									this.chatWidget.setModel(ref.object);
								}
							}
						});
				}));
			}
		});
	}

	private renderMcpSurface(): void {
		const section = this.section();
		append(section, $('h2.gitcortex-studio-shell-section-title', {}, SURFACE_LABELS.mcp));
		append(section, $('p.gitcortex-studio-shell-hint', {}, localize('gitcortex.shell.mcp.hint', "Les serveurs MCP sont gérés de façon centralisée par GitCortex. Utilisez la vue MCP du panneau pour configurer, autoriser et surveiller les serveurs, avec approbation explicite des actions sensibles.")));
		const openMcp = append(section, $('button.gitcortex-studio-shell-command-button'));
		openMcp.textContent = localize('gitcortex.shell.mcp.open', "Ouvrir les serveurs MCP");
		this.contentDisposables.add(addDisposableListener(openMcp, 'click', () => {
			void this.commandService.executeCommand('github.copilot.mcp.openServersView');
		}));
	}

	private renderDeveloperSurface(): void {
		const section = this.section();
		append(section, $('h2.gitcortex-studio-shell-section-title', {}, SURFACE_LABELS.developer));
		append(section, $('p.gitcortex-studio-shell-hint', {}, localize('gitcortex.shell.developer.hint', "Le mode développeur réexpose le workbench classique de Code-OSS : explorateur, débogueur, terminal, Git natif et panneaux techniques.")));

		const developerMode = this.configurationService.getValue<boolean>(GitCortexShellConfiguration.DeveloperMode);
		const toggle = append(section, $('button.gitcortex-studio-shell-command-button'));
		toggle.textContent = developerMode
			? localize('gitcortex.shell.developer.disable', "Désactiver le mode développeur")
			: localize('gitcortex.shell.developer.enable', "Activer le mode développeur");

		this.contentDisposables.add(addDisposableListener(toggle, 'click', async () => {
			// The config listener in setInput rebuilds the shell and toggles classic parts.
			await this.configurationService.updateValue(GitCortexShellConfiguration.DeveloperMode, !developerMode);
		}));
	}

	//#endregion

	//#region Layout

	override layout(dimension: Dimension): void {
		this.lastDimension = dimension;
		if (!this.container) {
			return;
		}
		this.container.style.height = `${dimension.height}px`;
		this.container.style.width = `${dimension.width}px`;

		if (this.currentSurface === 'chat' || this.currentSurface === 'vm') {
			this.layoutChatWidget();
			this.layoutVmWebview();
		}
	}

	private layoutChatWidget(): void {
		if (!this.chatWidget || !this.lastDimension) {
			return;
		}
		const width = Math.max(240, this.lastDimension.width - 180);
		const height = chatHeightForState(this.splitState, { height: Math.max(200, this.lastDimension.height) });
		this.chatWidget.layout(Math.max(96, height - 24), width);
	}

	private layoutVmWebview(): void {
		// The webview fills its mounted host, which is sized by the split layout.
		// No explicit layout call is needed for IWebviewElement: it tracks the
		// host element dimensions automatically.
		if (!this.vmWebview || !this.lastDimension || !this.vmWebviewHost) {
			return;
		}
		this.vmWebviewHost.style.height = '100%';
		this.vmWebviewHost.style.width = '100%';
	}

	override focus(): void {
		super.focus();
		this.chatWidget?.focusInput();
	}

	//#endregion
}

export class GitCortexStudioShellInputSerializer implements IEditorSerializer {
	canSerialize(editorInput: GitCortexStudioShellInput): boolean {
		return true;
	}

	serialize(editorInput: GitCortexStudioShellInput): string {
		return JSON.stringify({});
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): GitCortexStudioShellInput {
		return new GitCortexStudioShellInput({});
	}
}