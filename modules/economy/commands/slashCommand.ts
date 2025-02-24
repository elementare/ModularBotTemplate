import { 
  SlashCommandBuilder, 
  GuildMember, 
  TextChannel, 
  EmbedBuilder, 
  PermissionFlagsBits, 
  ButtonBuilder, 
  ButtonInteraction, 
  ButtonStyle, 
  ActionRowBuilder, 
  MessageFlags 
} from "discord.js";
import SlashCommand from "../../../classes/structs/SlashCommand";
import { ExtendedClient } from "../../../types";
import manifest from "../manifest.json";
import { TransactionType, RemoveErrorReason } from "../types";
import { v4 as uuidv4 } from "uuid";
import { url } from "inspector";
import { EconomySettings } from "../types";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("economia")
    .setDescription("Gerencia a economia da guilda")
    .addSubcommand(subcommand =>
      subcommand
        .setName("gerenciar")
        .setDescription("Operações administrativas: adicionar, remover ou transferir")
        .addStringOption(option =>
          option.setName("tipo")
            .setDescription("Tipo de transação")
            .setRequired(true)
            .addChoices(
              { name: "Adicionar", value: "adicionar" },
              { name: "Remover", value: "remover" },
              { name: "Transferir", value: "transferir" }
            )
        )
        .addUserOption(option =>
          option.setName("membro")
            .setDescription("Membro alvo")
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName("valor")
            .setDescription("Valor da transação")
            .setRequired(true)
        )
        .addUserOption(option =>
          option.setName("destino")
            .setDescription("Membro de destino (obrigatório para transferência)")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("pagar")
        .setDescription("Transfere dinheiro da sua conta para outro membro")
        .addUserOption(option =>
          option.setName("destino")
            .setDescription("Membro que receberá o pagamento")
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName("valor")
            .setDescription("Valor a ser pago")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("financas")
        .setDescription("Exibe seu resumo financeiro e histórico de transações")
    ),
  func: async ({ interaction, guild, logger, client }) => {
    if (!guild) {
      return interaction.reply({ content: "Este comando só pode ser usado em uma guild.", flags: MessageFlags.Ephemeral });
    }
    const nowStr = new Date().toLocaleString('pt-BR');

    async function canManage(member: GuildMember): Promise<boolean> {
      if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
      if (client.permissionHandler && typeof client.permissionHandler.checkPermissionFor === "function") {
        return await client.permissionHandler.checkPermissionFor("economy.manage", member, interaction.channel as TextChannel);
      }
      return false;
    }

    const economyModule = client.modules.get("economy");
    if (!economyModule) {
      return interaction.reply({ content: "O módulo de economia não está carregado, contate meu desenvolvedor.", flags: MessageFlags.Ephemeral });
    }
    const subcommand = interaction.options.getSubcommand();

    function generateCSV(transactions: any[]): string {
      const headers = ["ID", "Tipo", "Payer", "Receiver", "Valor", "Timestamp"];
      const lines = [headers.join(",")];
      transactions.forEach(tx => {
        const line = [
          `"${tx.id}"`,
          `"${tx.type}"`,
          `"${tx.payer}"`,
          `"${tx.receiver}"`,
          `"${tx.value}"`,
          `"${tx.timestamp}"`
        ].join(",");
        lines.push(line);
      });
      return lines.join("\n");
    }

    const guildSettings = guild.settings.get('economy')?.value as EconomySettings || undefined
    const bankName = guildSettings.name || guild.guild.id
    const coinSymbol = guildSettings.coinSymbol || "R$"
    const coinName = guildSettings.coinName || guild.guild.name

    try {
      if (subcommand === "gerenciar") {
        if (!interaction.member || !(interaction.member instanceof GuildMember)) {
          return interaction.reply({ content: "Membro inválido." });
        }
        if (!(await canManage(interaction.member))) {
          return interaction.reply({ content: "Você não tem permissão para executar este comando." });
        }
        const tipo = interaction.options.getString("tipo", true);
        const membroOption = interaction.options.getMember("membro");
        const valor = interaction.options.getNumber("valor", true);
        const destinoOption = interaction.options.getMember("destino");
        if (!membroOption || !(membroOption instanceof GuildMember)) {
          return interaction.reply({ content: "Membro inválido." });
        }
        const targetUser = await client.profileHandler.fetchOrCreate(membroOption.id, guild.id);
        let result: any;
        if (tipo === "adicionar") {
          result = await economyModule.interfacer.createTransaction(
            interaction, 
            TransactionType.ADD_MONEY,
            targetUser,
            guild.id,
            valor,
            interaction.channel
          );
          const embed = new EmbedBuilder()
            .setTitle("✅ Transação – Adicionar")
            .setDescription(`Foram adicionados **${coinSymbol}${valor}** à conta de <@${membroOption.id}>.`)
            .addFields(
              { name: "Saldo Anterior", value: `${coinSymbol}${result.userPreviousBalance}`, inline: true },
              { name: "Saldo Atual", value: `${coinSymbol}${result.userCurrentBalance}`, inline: true }
            )
            .setFooter({ text: `Transação realizada em ${nowStr}` })
            .setColor(0x00AE86);

          return interaction.editReply({ embeds: [embed], components: [] });
        } else if (tipo === "remover") {
          result = await economyModule.interfacer.createTransaction(
            interaction,
            TransactionType.REMOVE_MONEY,
            targetUser,
            guild.id,
            valor,
            interaction.channel
          );
          const embed = new EmbedBuilder()
            .setTitle("✅ Transação – Remover")
            .setDescription(`Foram removidos **${coinSymbol}${valor}** da conta de <@${membroOption.id}>.`)
            .addFields(
              { name: "Saldo Anterior", value: `${coinSymbol}${result.userPreviousBalance}`, inline: true },
              { name: "Saldo Atual", value: `${coinSymbol}${result.userCurrentBalance}`, inline: true }
            )
            .setFooter({ text: `Transação realizada em ${nowStr}` })
            .setColor(0xE74C3C);
          return interaction.editReply({ embeds: [embed], components: [] });
        } else if (tipo === "transferir") {
          if (!destinoOption || !(destinoOption instanceof GuildMember)) {
            return interaction.reply({ content: "Para transferência, informe o membro de destino." });
          }
          const originUser = await client.profileHandler.fetchOrCreate(membroOption.id, guild.id);
          const destUser = await client.profileHandler.fetchOrCreate(destinoOption.id, guild.id);
          result = await economyModule.interfacer.createTransaction(
            interaction,
            TransactionType.TRANSFER_MONEY,
            originUser,
            guild.id,
            valor,
            interaction.channel,
            destUser
          );
          const embed = new EmbedBuilder()
            .setTitle("✅ Transação – Transferir")
            .setDescription(`Transferência de **${coinSymbol}${valor}** realizada de <@${membroOption.id}> para <@${destinoOption.id}>.`)
            .addFields(
              { name: "Saldo do Remetente (Anterior)", value: `${coinSymbol}${result.userPreviousBalance}`, inline: true },
              { name: "Saldo do Remetente (Atual)", value: `${coinSymbol}${result.userCurrentBalance}`, inline: true },
              { name: "Saldo do Destinatário (Anterior)", value: `${coinSymbol}${result.targetPreviousBalance}`, inline: true },
              { name: "Saldo do Destinatário (Atual)", value: `${coinSymbol}${result.targetCurrentBalance}`, inline: true }
            )
            .setFooter({ text: `Transação realizada em ${nowStr}` })
            .setColor(0x3498DB);
          return interaction.editReply({ embeds: [embed], components: [] });
        } else {
          return interaction.reply({ content: "Tipo de transação inválido." });
        }
      }
      else if (subcommand === "pagar") {
        const destinoOption = interaction.options.getMember("destino");
        const valor = interaction.options.getNumber("valor", true);
        if (!destinoOption || !(destinoOption instanceof GuildMember)) {
          return interaction.reply({ content: "Membro destino inválido." });
        }
        const originUser = await client.profileHandler.fetchOrCreate(interaction.user.id, guild.id);
        const destUser = await client.profileHandler.fetchOrCreate(destinoOption.id, guild.id);
        const result = await economyModule.interfacer.createTransaction(
          interaction,
          TransactionType.TRANSFER_MONEY,
          originUser,
          guild.id,
          valor,
          interaction.channel,
          destUser
        );
        const embed = new EmbedBuilder()
          .setTitle("✅ Pagamento Realizado")
          .setDescription(`Você transferiu **${coinSymbol}${valor}** para <@${destinoOption.id}>.`)
          .addFields(
            { name: "Seu Saldo (Anterior)", value: `${coinSymbol}${result.userPreviousBalance}`, inline: true },
            { name: "Seu Saldo (Atual)", value: `${coinSymbol}${result.userCurrentBalance}`, inline: true },
            { name: "Saldo do Destinatário (Anterior)", value: `${coinSymbol}${result.targetPreviousBalance}`, inline: true },
            { name: "Saldo do Destinatário (Atual)", value: `${coinSymbol}${result.targetCurrentBalance}`, inline: true }
          )
          .setFooter({ text: `Transação realizada em ${nowStr}` })
          .setColor(0x00AE86);
        return interaction.editReply({ embeds: [embed], components: [] });
      }
      else if (subcommand === "financas") {
      
        const { InteractionView } = await import("../../../utils/InteractionView");
        
        const profiles = await client.profileHandler.findByKV({ id: interaction.user.id, guildId: guild.id });
        if (!profiles || profiles.length === 0) {
          return interaction.reply({ content: "Perfil não encontrado." });
        }
        const userProfile = profiles[0];
        const userData = userProfile.data;
        const balance = userData[manifest.name]?.balance ?? 0;
        const accountCreation = userData.createdAt ? new Date(userData.createdAt).toLocaleString('pt-BR') : "Não disponível";
      
        let recentTransactions: any[] = [];
        try {
          recentTransactions = await economyModule.interfacer.consultTransactions(interaction.user.id, { guildId: guild.id, limit: 7, order: 'desc' });
        } catch (err) {
          logger.error("Erro ao consultar transações recentes:", err);
          recentTransactions = [];
        }

        const summaryEmbed = new EmbedBuilder()
          .setAuthor({name: bankName, iconURL: guild.guild.iconURL() || undefined, })
          .setDescription(`## Bem vindo(a) <@${interaction.user.id}>!`)
          .setThumbnail(interaction.user.avatarURL())
          .addFields(
            { name: "Saldo", value: `${coinSymbol}${balance}`, inline: false },
            { name: "Última Consulta", value: nowStr, inline: false }
          )
          .addFields({ name: "\u200B", value: "**Últimas 7 Transações:**", inline: false });
        
        recentTransactions.forEach((tx, index) => {
          const date = new Date(tx.timestamp);
          const formattedDate = `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
          let valorStr = "";
          const origem = tx.payer === "SYSTEM" ? "SYSTEM" : `<@${tx.payer}>`;
          const destino = tx.receiver === "SYSTEM" ? "SYSTEM" : `<@${tx.receiver}>`;
          if (tx.type === TransactionType.ADD_MONEY) {
            valorStr = `+${coinSymbol}${tx.value}`;

          } else if (tx.type === TransactionType.REMOVE_MONEY) {
            valorStr = `-${coinSymbol}${tx.value}`;

          } else if (tx.type === TransactionType.TRANSFER_MONEY) {
            if (tx.payer === interaction.user.id) {
              valorStr = `-${coinSymbol}${tx.value}`;
            } else if (tx.receiver === interaction.user.id) {
              valorStr = `+${coinSymbol}${tx.value}`;
            } else {
              valorStr = `${coinSymbol}${tx.value}`;
            }
          }

          
          summaryEmbed.addFields({
            name: `Transação ${index + 1}`,
            value: `**ID:** ${tx.id}\n**Remetente:**${origem}\n**Destino:**${destino}\n**Valor:** ${valorStr}\n**Data:** ${formattedDate}`,
            inline: false
          })
        });
        
        summaryEmbed.setColor(0x3498DB)
          .setFooter({ text: `Resumo emitido em ${nowStr}`, iconURL: guild.guild.iconURL() || undefined });
        
        const summaryButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("ver_historico").setLabel("Ver Histórico de Transações").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("emitir_extrato").setLabel("Emitir Extrato").setStyle(ButtonStyle.Secondary)
        );
        
        const view = new InteractionView(interaction, interaction.channel as TextChannel, client, {
          ephemeral: false,
          filter: (i) => i.user.id === interaction.user.id,
          timeout: 5 * 60 * 1000
        });

        await view.update({ embeds: [summaryEmbed], components: [summaryButtons] });
        
        view.on("emitir_extrato", async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.deferUpdate();
          try {
            const txs = await economyModule.interfacer.consultTransactions(interaction.user.id, { guildId: guild.id, limit: 50, order: 'desc' });
            const csvContent = generateCSV(txs);
            await interaction.followUp({ content: "Extrato gerado.", files: [{ attachment: Buffer.from(csvContent), name: "extrato.csv" }], ephemeral: false });
          } catch (err) {
            await interaction.followUp({ content: "Não consegui emitir o extrato: Erro desconhecido.", ephemeral: false });
          }
        });

        view.on("ver_historico", async (btnInteraction: ButtonInteraction) => {
          await btnInteraction.deferUpdate();
        
          let currentMode: "local" | "global" = "local";
          let currentOrder: "asc" | "desc" = "desc";
          let allTransactions: any[] = [];
          let pages: any[] = [];
          let currentPage = 0;
        
          async function updateHistoricalEmbed() {
            try {

              const filters: any = { limit: 50, order: currentOrder };
              if (currentMode === "local") filters.guildId = guild.id;
              allTransactions = await economyModule!.interfacer.consultTransactions(interaction.user.id, filters);
              pages = [];
              if (!allTransactions || allTransactions.length === 0) {
                pages.push({ content: "Nenhuma transação encontrada." });
              } else {
                const formattedTx = allTransactions.map((tx, index) => {
                  const date = new Date(tx.timestamp);
                  const formattedDate = `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
                  const origem = tx.payer === "SYSTEM" ? "SYSTEM" : `<@${tx.payer}>`;
                  const destino = tx.receiver === "SYSTEM" ? "SYSTEM" : `<@${tx.receiver}>`;
                  let valorStr = "";
              
                  if (tx.type === TransactionType.ADD_MONEY) {
                    valorStr = `+${coinSymbol}${tx.value}`;
                  } else if (tx.type === TransactionType.REMOVE_MONEY) {
                    valorStr = `-${coinSymbol}${tx.value}`;
                  } else if (tx.type === TransactionType.TRANSFER_MONEY) {
                    if (tx.payer === interaction.user.id) {
                      valorStr = `-${coinSymbol}${tx.value}`;
                    } else if (tx.receiver === interaction.user.id) {
                      valorStr = `+${coinSymbol}${tx.value}`;
                    } else {
                      valorStr = `${coinSymbol}${tx.value}`;
                    }
                  }
              
                  return {
                    name: `Transação ${index + 1}`,
                    value: `**ID:** ${tx.id}\n**Remetente:** ${origem}\n**Destino:** ${destino}\n**Valor:** ${valorStr}\n**Data:** ${formattedDate}`,
                    inline: false
                  };
                });
                for (let i = 0; i < formattedTx.length; i += 10) {
                  pages.push({ fields: formattedTx.slice(i, i + 10) });
                }
              }

              const historyEmbed = new EmbedBuilder()
                .setTitle("📜 Histórico de Transações")
                .setDescription(pages[currentPage]?.fields?.length ? null : "Nenhuma transação encontrada.")
                .setFooter({ text: `Página ${currentPage + 1} de ${pages.length}` });
              
              if (pages[currentPage]?.fields) {
                for (const field of pages[currentPage].fields) {
                  historyEmbed.addFields(field);
                }
              }
        
              const modeLocalButton = new ButtonBuilder()
                .setCustomId("mode_local")
                .setLabel("Local")
                .setStyle(currentMode === "local" ? ButtonStyle.Success : ButtonStyle.Primary)
                .setDisabled(currentMode === "local");
              const modeGlobalButton = new ButtonBuilder()
                .setCustomId("mode_global")
                .setLabel("Global")
                .setStyle(currentMode === "global" ? ButtonStyle.Success : ButtonStyle.Primary)
                .setDisabled(currentMode === "global");
              const toggleOrderButton = new ButtonBuilder()
                .setCustomId("toggle_order")
                .setLabel(`Ordem: ${currentOrder === "desc" ? "Desc" : "Asc"}`)
                .setStyle(ButtonStyle.Secondary);
              const retornarButton = new ButtonBuilder()
                .setCustomId("retornar")
                .setLabel("Retornar")
                .setStyle(ButtonStyle.Danger);
              const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                modeLocalButton, modeGlobalButton, toggleOrderButton, retornarButton
              );
              if (pages.length > 1) {
                const anteriorButton = new ButtonBuilder()
                  .setCustomId("anterior")
                  .setLabel("Anterior")
                  .setStyle(ButtonStyle.Primary);
                const proximoButton = new ButtonBuilder()
                  .setCustomId("proximo")
                  .setLabel("Próximo")
                  .setStyle(ButtonStyle.Primary);
                buttonsRow.addComponents(anteriorButton, proximoButton);
              }
              await view.update({ embeds: [historyEmbed], components: [buttonsRow] });
            } catch (err) {
              await view.update({ embeds: [], content: "Erro ao carregar histórico de transações.", components: [] });
            }
          }

          await updateHistoricalEmbed();
        
          view.on("mode_local", async (i: ButtonInteraction) => {
            await i.deferUpdate();
            currentMode = "local";
            currentPage = 0;
            await updateHistoricalEmbed();
          });
          view.on("mode_global", async (i: ButtonInteraction) => {
            await i.deferUpdate();
            currentMode = "global";
            currentPage = 0;
            await updateHistoricalEmbed();
          });
          view.on("toggle_order", async (i: ButtonInteraction) => {
            await i.deferUpdate();
            currentOrder = currentOrder === "desc" ? "asc" : "desc";
            currentPage = 0;
            await updateHistoricalEmbed();
          });
          view.on("anterior", async (i: ButtonInteraction) => {
            await i.deferUpdate();
            currentPage = currentPage > 0 ? currentPage - 1 : pages.length - 1;
            await updateHistoricalEmbed();
          });
          view.on("proximo", async (i: ButtonInteraction) => {
            await i.deferUpdate();
            currentPage = currentPage < pages.length - 1 ? currentPage + 1 : 0;
            await updateHistoricalEmbed();
          });
          view.on("retornar", async (i: ButtonInteraction) => {
            await i.deferUpdate();
            await view.update({ embeds: [summaryEmbed], components: [summaryButtons] });
          });
        })
      }
      else {
        return interaction.reply({ content: "Subcomando inválido.", flags: MessageFlags.Ephemeral });
      }
      
    } catch (error: any) {
      let msg = "Erro desconhecido.";
      if (error.reason === RemoveErrorReason.INSUFFICIENT_FUNDS) {
        msg = "Fundos insuficientes.";
      } else {
        logger.error(error.reason)
      }
      return interaction.editReply({ components: [], embeds: [], content: `Não consegui completar a transação: ${msg}` });
    }
  },
  global: true,
});
