import {
  Box,
  Button,
  Center,
  Flex,
  HStack,
  Icon,
  IconButton,
  Link,
  List,
  SimpleGrid,
  Spinner,
  Tag,
  Text,
  useBoolean,
  useClipboard,
  Tooltip,
} from "@chakra-ui/react";

import {
  DownloadIcon,
  DeleteIcon,
  CheckIcon,
  CopyIcon,
} from "@chakra-ui/icons";
import { NODE_STATE_RECORD } from "config/constants";
import axios from "axios";
import { useWalletSelector } from "components/WalletSelectorContextProvider";
import {
  AnchorContract,
  AppchainInfo,
  CloudVendor,
  NodeState,
  Validator,
} from "types";
import { RegisterValidatorModal } from "views/Appchain/MyStaking/RegisterValidatorModal";
import { BsArrowUpRight } from "react-icons/bs";
import NodeManager from "utils/NodeManager";
import { FaAws, FaDigitalOcean } from "react-icons/fa";

export default function NodeBoard({
  node,
  cloudVendor,
  deployConfig,
  deployAccessKey,
  appchainId,
  setNode,
  appchain,
  anchor,
  validator,
  isInitializing,
}: {
  node?: any;
  cloudVendor: CloudVendor;
  deployConfig?: any;
  deployAccessKey: string;
  appchainId?: string;
  setNode: (node: any) => void;
  appchain?: AppchainInfo;
  anchor?: AnchorContract;
  validator?: Validator;
  isInitializing: boolean;
}) {
  const [isApplying, setIsApplying] = useBoolean();
  const [isDeleting, setIsDeleting] = useBoolean();
  const [isDestroying, setIsDestroying] = useBoolean();
  const [registerValidatorModalOpen, setRegisterValidatorModalOpen] =
    useBoolean(false);

  const { hasCopied: hasNodeIdCopied, onCopy: onCopyNodeId } = useClipboard(
    node?.uuid || ""
  );

  const { accountId, network } = useWalletSelector();

  const onApplyNode = async () => {
    let secretKey = "";

    if (cloudVendor === CloudVendor.AWS) {
      secretKey =
        window.prompt("Please enter the secret key of your server", "") ?? "";

      if (!secretKey) {
        return;
      }
    } else {
      // const { access_token } = oauthUser.getAuthResponse()
      // secretKey = access_token
    }

    setIsApplying.on();
    await NodeManager.applyNode({
      uuid: node?.uuid,
      network,
      secretKey,
      user: node?.user,
    });
    window.location.reload();
  };

  const onDeleteNode = async () => {
    setIsDeleting.on();
    await NodeManager.deleteNode({ uuid: node.uuid, user: node.user, network });
    window.location.reload();
  };

  const onDestroyNode = () => {
    let secretKey;

    if ([CloudVendor.AWS, CloudVendor.DO].includes(cloudVendor)) {
      secretKey = window.prompt(
        CloudVendor.AWS === cloudVendor
          ? "Please enter the secret key of your server"
          : "Please enter the personal access token of your server",
        ""
      );

      if (!secretKey) {
        return;
      }
    } else {
    }

    setIsDestroying.on();
    axios
      .delete(`${deployConfig.deployApiHost}/tasks/${node?.uuid}`, {
        data: {
          secret_key: secretKey,
        },
        headers: { authorization: node?.user },
      })
      .then((res) => {
        window.location.reload();
      });
  };

  return (
    <Box mt={3}>
      <List spacing={2}>
        <Flex justifyContent="space-between">
          <Text variant="gray" fontSize="sm">
            Cloud
          </Text>
          {node.task.cloud_vendor === CloudVendor.AWS ? (
            <Flex alignItems="center" gap={2}>
              <Text fontSize="sm">AWS</Text>
              <FaAws size={18} />
            </Flex>
          ) : (
            <Flex alignItems="center" gap={2}>
              <Text fontSize="sm">Digital Ocean</Text>
              <FaDigitalOcean size={18} />
            </Flex>
          )}
        </Flex>
        <Flex justifyContent="space-between">
          <Text variant="gray" fontSize="sm">
            Status
          </Text>
          <Tag
            colorScheme={NODE_STATE_RECORD[node.state as NodeState]?.color}
            size="sm"
          >
            {node.state === NodeState.RUNNING && !node.sync
              ? "Syncing"
              : NODE_STATE_RECORD[node.state as NodeState]?.label}
          </Tag>
        </Flex>
        <Flex justifyContent="space-between">
          <Text variant="gray" fontSize="sm">
            Node ID
          </Text>
          <HStack>
            <Text
              fontSize="sm"
              whiteSpace="nowrap"
              w="calc(160px - 30px)"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {node.uuid}
            </Text>
            <IconButton aria-label="copy" onClick={onCopyNodeId} size="xs">
              {hasNodeIdCopied ? <CheckIcon /> : <CopyIcon />}
            </IconButton>
          </HStack>
        </Flex>
        <Flex justifyContent="space-between">
          <Text variant="gray" fontSize="sm">
            Instance
          </Text>
          {node.instance ? (
            <HStack>
              <Text
                fontSize="sm"
                whiteSpace="nowrap"
                w="calc(160px - 30px)"
                overflow="hidden"
                textOverflow="ellipsis"
              >
                {node.instance.region}@{node.instance.id}
              </Text>
              <Link href={node.instance.url} target="_blank">
                <IconButton aria-label="link" size="xs">
                  <BsArrowUpRight color="octo-blue" />
                </IconButton>
              </Link>
            </HStack>
          ) : (
            "-"
          )}
        </Flex>
      </List>
      <Box mt={3}>
        {node?.state === NodeState.INIT ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Button
              colorScheme="octo-blue"
              onClick={onApplyNode}
              isDisabled={isApplying}
              isLoading={isApplying}
            >
              Apply
            </Button>
            <Button
              onClick={onDeleteNode}
              isDisabled={isDeleting}
              isLoading={isDeleting}
            >
              <Icon as={DeleteIcon} mr={2} boxSize={3} /> Delete
            </Button>
          </SimpleGrid>
        ) : node?.state === NodeState.APPLYING ||
          node?.state === NodeState.DESTROYING ? (
          <SimpleGrid columns={1}>
            <Center gap={4}>
              <Spinner
                size="md"
                thickness="4px"
                speed="1s"
                color="octo-blue.500"
              />
              <Text fontSize="sm" color="gray">
                {NODE_STATE_RECORD[node.state as NodeState].label}
              </Text>
            </Center>
          </SimpleGrid>
        ) : node?.state === NodeState.APPLY_FAILED ||
          node?.state === NodeState.DESTROY_FAILED ? (
          <SimpleGrid columns={1}>
            <Button
              colorScheme="red"
              onClick={onDestroyNode}
              isDisabled={isDestroying}
              isLoading={isDestroying}
            >
              <Icon as={DeleteIcon} mr={2} boxSize={3} /> Destroy
            </Button>
          </SimpleGrid>
        ) : node?.state === NodeState.RUNNING ? (
          <SimpleGrid
            columns={{ base: 1, md: node.instance?.ssh_key ? 2 : 1 }}
            spacing={4}
          >
            {node.instance?.ssh_key && (
              <Button as={Link} isExternal href={node.instance.ssh_key}>
                <Icon as={DownloadIcon} mr={2} boxSize={3} /> RSA
              </Button>
            )}
            <Button
              colorScheme="red"
              onClick={onDestroyNode}
              isDisabled={isDestroying}
              isLoading={isDestroying}
            >
              <Icon as={DeleteIcon} mr={2} boxSize={3} /> Destroy
            </Button>
          </SimpleGrid>
        ) : node?.state === NodeState.DESTROYED ? (
          <SimpleGrid columns={1}>
            <Button
              onClick={onDeleteNode}
              isDisabled={isDeleting}
              isLoading={isDeleting}
            >
              <Icon as={DeleteIcon} mr={2} boxSize={3} /> Delete
            </Button>
          </SimpleGrid>
        ) : node?.state === NodeState.UPGRADING ? (
          <SimpleGrid columns={1}>
            {node.instance.ssh_key && (
              <Button as={Link} isExternal href={node.instance.ssh_key}>
                <Icon as={DownloadIcon} mr={2} boxSize={3} /> RSA
              </Button>
            )}
          </SimpleGrid>
        ) : null}
      </Box>

      {!validator && (
        <Tooltip
          label={
            !node?.sync
              ? "You will be able to register validator after node synced"
              : ""
          }
          bg="gray.300"
          color="black"
          p={4}
        >
          <Button
            onClick={node?.sync ? setRegisterValidatorModalOpen.on : undefined}
            colorScheme="octo-blue"
            isDisabled={!accountId}
            width="100%"
            opacity={node?.sync ? 1 : 0.5}
            mt={4}
          >
            {!accountId ? "Please Login" : "Register Validator"}
          </Button>
        </Tooltip>
      )}

      <RegisterValidatorModal
        isOpen={registerValidatorModalOpen}
        onClose={setRegisterValidatorModalOpen.off}
        anchor={anchor}
        appchain={appchain}
      />
    </Box>
  );
}
