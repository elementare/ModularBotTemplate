import { Logger } from "winston";
import { BaseModuleInterfacer, ExtendedClient } from "../../types";
import { Setting } from "../../settings/Setting";
import manifest from "./manifest.json";
import User from "../../classes/structs/User";
import Guild from "../../classes/structs/Guild";
import { CreateView } from "../../utils/MessageView";
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ActionRowBuilder
} from "discord.js";
import { TransactionType, RemoveErrorReason } from "./types";
import { v4 as uuidv4 } from "uuid";
import { Client as ESClient } from '@elastic/elasticsearch';
import Snowflakify from 'snowflakify';
import { InteractionView } from "../../utils/InteractionView";
import { IDoNotCareAboutPartialGroupDMs } from "../../types";
import { ChatInputCommandInteraction } from "discord.js";
import {StringSettingFile} from "../../settings/DefaultTypes/string";
import ComplexSettingClass from "../../settings/DefaultTypes/complex";
import { EmbedBuilder } from "discord.js";

async function registerIndex(esClient: ESClient, guildId: string): Promise<string> {
  return new Promise(async (resolve) => {
    await esClient.indices.create({
      index: `bots.kikyo.transactions.${guildId}`,
      mappings: {
        properties: {
          transactionId: { type: 'keyword' },
          timestamp: { type: 'date' }
        }
      }
    }).catch(() => {}); 
    resolve(`bots.kikyo.transactions.${guildId}`);
  });
}

async function index(esClient: ESClient, indexName: string, data: Record<string, any>): Promise<void> {
  return new Promise(async (resolve) => {
    data.timestamp = new Date().toISOString();
    await esClient.index({
      index: indexName,
      document: data
    });
    resolve();
  });
}

async function saveTransaction(esClient: ESClient, guildId: string, transactionData: Record<string, any>): Promise<{ success: boolean, error?: string }> {
  return new Promise(async (resolve) => {
    registerIndex(esClient, guildId)
      .then((indexName) => {
        if (!indexName) return resolve({ success: false, error: `Falha ao obter o índice para guilda ${guildId}.` });
        index(esClient, indexName, transactionData)
          .then(() => resolve({ success: true }))
          .catch((err) => resolve({ success: false, error: err instanceof Error ? err.message : JSON.stringify(err) }));
      })
      .catch((err) => resolve({ success: false, error: err instanceof Error ? err.message : JSON.stringify(err) }));
  });
}

module.exports = async (client: ExtendedClient, _: any, logger: Logger): Promise<{
    interfacer: BaseModuleInterfacer,
    settings: Array<Setting<any>>
}> => {
  logger.notice(`Initializing economy module`);

  class Interfacer implements BaseModuleInterfacer {
    private esclient: ESClient;
    private snowflakify: Snowflakify;
    constructor(logger: Logger) {
      logger.notice(`Economy interfacer initialized`);
      this.esclient = new ESClient({
        node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200'
      });

      this.esclient.ping({}, { requestTimeout: 3000 })
        .then(() => {
          logger.notice('Conexão com Elasticsearch realizada com sucesso!');
        })
        .catch((error: any) => {
          logger.error('Elasticsearch cluster está inativo ou inacessível!', error);
        });

      this.snowflakify = new Snowflakify();
    }
    
    add(user: User, guildId: string, value: number): Promise<object> {
      return new Promise(async (resolve, reject) => {
        const session = await client.defaultModels.user.startSession();
        session.startTransaction();
        try {
          if (!user.data[manifest.name]) {
            user.data[manifest.name] = { balance: 0 };
          }
          const transactionId = this.snowflakify.nextId().toString();
          const userPreviousBalance = user.data[manifest.name].balance;
          user.data[manifest.name].balance += value;
          await user.data.save({ session });
          const document = {
            id: transactionId,
            type: TransactionType.ADD_MONEY,
            payer: "SYSTEM",
            receiver: user.id,
            value: value
          };
          const { success, error } = await saveTransaction(this.esclient, guildId, document)
            .catch(err => ({ success: false, error: err instanceof Error ? err.message : JSON.stringify(err) }));
          if (!success) {
            throw new Error(`Falha ao salvar a transação: ${error}`);
          }
          await session.commitTransaction();
          session.endSession();
          resolve({
            transactionId,
            userPreviousBalance,
            userCurrentBalance: user.data[manifest.name].balance,
            value,
            user
          });
        } catch (error: any) {
          await session.abortTransaction();
          session.endSession();
          logger.error(`Erro em add(): ${error instanceof Error ? error.message : JSON.stringify(error)}`);
          reject(error);
        }
      });
    }

    remove(user: User, guildId: string, value: number): Promise<object> {
      return new Promise(async (resolve, reject) => {
        const session = await client.defaultModels.user.startSession();
        session.startTransaction();
        if (!user.data[manifest.name]) {
          user.data[manifest.name] = { balance: 0 };
        }
        const transactionId = this.snowflakify.nextId().toString();
        const userPreviousBalance = user.data[manifest.name].balance;
        if (userPreviousBalance < value) {
          session.endSession();
          return reject({
            transactionId,
            currentBalance: userPreviousBalance,
            value,
            reason: RemoveErrorReason.INSUFFICIENT_FUNDS,
          });
        }
        try {
          user.data[manifest.name].balance -= value;
          await user.data.save({ session });
          const document = {
            id: transactionId,
            type: TransactionType.REMOVE_MONEY,
            payer: user.id,
            receiver: "SYSTEM",
            value: value
          };
          const { success, error } = await saveTransaction(this.esclient, guildId, document)
            .catch(err => ({ success: false, error: err instanceof Error ? err.message : JSON.stringify(err) }));
          if (!success) {
            throw new Error(`Falha ao salvar a transação: ${error}`);
          }
          await session.commitTransaction();
          session.endSession();
          resolve({
            transactionId,
            userPreviousBalance,
            userCurrentBalance: user.data[manifest.name].balance,
            value,
            user
          });
        } catch (error: any) {
          await session.abortTransaction();
          session.endSession();
          logger.error(`Erro em remove(): ${error instanceof Error ? error.message : JSON.stringify(error)}`);
          reject(error);
        }
      });
    }
    
    transfer(user: User, guildId: string, target: User, value: number): Promise<object> {
      return new Promise(async (resolve, reject) => {
        const session = await client.defaultModels.user.startSession();
        session.startTransaction();
        try {
          if (!user.data[manifest.name]) {
            user.data[manifest.name] = { balance: 0 };
          }
          if (!target.data[manifest.name]) {
            target.data[manifest.name] = { balance: 0 };
          }
          const transactionId = this.snowflakify.nextId().toString();
          const userPreviousBalance = user.data[manifest.name].balance;
          const targetPreviousBalance = target.data[manifest.name].balance;
          if (userPreviousBalance < value) {
            session.endSession();
            return reject({
              transactionId,
              currentBalance: userPreviousBalance,
              value,
              reason: RemoveErrorReason.INSUFFICIENT_FUNDS,
            });
          }
          user.data[manifest.name].balance -= value;
          target.data[manifest.name].balance += value;
          await user.data.save({ session });
          await target.data.save({ session });
          const document = {
            id: transactionId,
            type: TransactionType.TRANSFER_MONEY,
            payer: user.id,
            receiver: target.id,
            value: value
          };
          const { success, error } = await saveTransaction(this.esclient, guildId, document)
            .catch(err => ({ success: false, error: err instanceof Error ? err.message : JSON.stringify(err) }));
          if (!success) {
            throw new Error(`Falha ao salvar a transação: ${error}`);
          }
          await session.commitTransaction();
          session.endSession();
          resolve({
            transactionId,
            userPreviousBalance,
            userCurrentBalance: user.data[manifest.name].balance,
            targetPreviousBalance,
            targetCurrentBalance: target.data[manifest.name].balance,
            value,
            user,
            target
          });
        } catch (error: any) {
          await session.abortTransaction();
          session.endSession();
          logger.error(`Erro em transfer(): ${error instanceof Error ? error.message : JSON.stringify(error)}`);
          reject(error);
        }
      });
    }
    
    createTransaction(interaction: IDoNotCareAboutPartialGroupDMs<ChatInputCommandInteraction>, type: TransactionType, user: User, guildId: string, value: number, channel: any, target?: User): Promise<object> {
      return new Promise(async (resolve, reject) => {
        try {
          const transactionActions = {
            [TransactionType.ADD_MONEY]: {
              label: `Você deseja adicionar R$${value} na conta do <@${user.id}>?`,
              action: () => this.add(user, guildId, value)
            },
            [TransactionType.REMOVE_MONEY]: {
              label: `Você deseja retirar R$${value} da conta do <@${user.id}>?`,
              action: () => this.remove(user, guildId, value)
            },
            [TransactionType.TRANSFER_MONEY]: {
              label: `Você deseja transferir R$${value} para o usuário`,
              action: () => {
                if (!target) {
                  return Promise.reject(new Error("Usuário alvo não especificado para transferência."));
                }
                return this.transfer(user, guildId, target, value);
              }
            }
          };
          
          const transactionData = transactionActions[type];
          if (!transactionData) {
            logger.error(type)
            return reject(new Error("Tipo de transação inválido."));
          }
          const confirmationMessage = `${transactionData.label} ${target ? `<@${target.id}>` : ""}`;
          
          const view = new InteractionView(interaction, channel, client, {
            ephemeral: false,
            timeout: 60000,
            filter: (i) => i.user.id === interaction.user.id 
          });
          
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("confirm_transaction").setLabel("Confirmar").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("cancel_transaction").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
          );
          
          await view.update({ content: confirmationMessage, components: [row] });
          
          view.once("confirm_transaction", async (btnInteraction: ButtonInteraction) => {
            await btnInteraction.deferUpdate();
            view.destroy();
            transactionData.action().then(resolve).catch(reject);
          });
          
          view.once("cancel_transaction", async (btnInteraction: ButtonInteraction) => {
            await btnInteraction.deferUpdate();
            view.destroy();
            reject(new Error("Transação cancelada pelo usuário."));
          });
          

          view.once("end", async (reason: string) => {
            if (reason === "time") {
              try {
                await interaction.deleteReply();
              } catch (e) {
              }
            }
          });
          
        } catch (error: any) {
          logger.error(`Erro em createTransaction(): ${error instanceof Error ? error.message : JSON.stringify(error)}`);
          reject(error);
        }
      });
    }
    
    consultTransactions(userId: string, filters: { guildId?: string, limit?: number, order?: 'asc' | 'desc' } = {}): Promise<any> {
      return new Promise(async (resolve, reject) => {
        try {
          const { guildId, limit = 50, order = 'desc' } = filters;
          const indexName = guildId ? `bots.kikyo.transactions.${guildId}` : "bots.kikyo.transactions.*";
          const result = await this.esclient.search({
            index: indexName,
            body: {
              query: {
                bool: {
                  should: [
                    { term: { receiver: userId } },
                    { term: { payer: userId } }
                  ]
                }
              },
              sort: [
                { timestamp: { order } }
              ],
              size: limit
            }
          });
          const transactions = result.hits.hits.map((hit: any) => hit._source);
          resolve(transactions);
        } catch (err: any) {
          logger.error("Erro ao consultar transações:", err);
          reject(new Error("Erro desconhecido."));
        }
      });
    }

  }

  const interfacer = new Interfacer(logger);

  const settings: Array<Setting<any>> = [
    new ComplexSettingClass({
      name: 'Economia',
      description: 'Define as configurações de economia do servidor',
      id: 'economy',
      updateFn: (value) => {
          const humanReadable = new Map<string, string>([
              ['name', 'Nome do Banco'],
              ['coinName', 'Nome da moeda'],
              ['coinSymbol', 'Símbolo da moeda']
          ])
          const fields = []
          for (const key in value) {
              fields.push({
                  name: humanReadable.get(key) ?? key,
                  value: value[key] + '',
                  inline: true
              })
          }
          return new EmbedBuilder()
              .setTitle("Economia")
              .setColor('#daccff')
              .setDescription('Define as configurações de economia do servidor')
              .setFields(fields)
      },
      schema: {
          name: new StringSettingFile({
              name: 'Nome do Banco',
              description: 'Nome do Banco',
              id: 'name',
              color: '#eee8ff',
          }),
          coinName: new StringSettingFile({
              name: 'Nome da moeda',
              description: 'Nome da sua moeda',
              id: 'coinName',
              color: '#eee8ff',
          }, 'reais'),
          coinSymbol: new StringSettingFile({
              name: 'Símbolo da moeda',
              description: 'Símbolo da moeda, por exemplo **R$, $, ¥** e etc',
              id: 'coinSymbol',
              color: '#eee8ff'
          }, 'R$')
      }
    })
  ]

  return {
    interfacer,
    settings: settings
  };
};
