import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';

import {
  Box,
  useColorModeValue,
  Image,
  Heading,
  SimpleGrid,
  Text,
  HStack,
  Center,
  VStack,
  Button,
  Icon,
  Flex,
  useBoolean,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  useToast
} from '@chakra-ui/react';

import { 
  Validator, 
  AnchorContract, 
  AppchainInfoWithAnchorStatus
} from 'types';

import {
  COMPLEX_CALL_GAS,
  OCT_TOKEN_DECIMALS,
  FAILED_TO_REDIRECT_MESSAGE
} from 'primitives';

import { BsThreeDots } from 'react-icons/bs';
import { AddIcon, MinusIcon } from '@chakra-ui/icons';

import myStakingBg from 'assets/my-staking-bg.png';
import empty from 'assets/empty.png';

import { useGlobalStore } from 'stores';
import { RegisterValidatorModal } from './RegisterValidatorModal';

import { AmountInput } from 'components';
import { DecimalUtil, ZERO_DECIMAL } from 'utils';

type MyStakingProps = {
  appchain: AppchainInfoWithAnchorStatus | undefined;
  anchor: AnchorContract | null;
}

type StakingPopoverProps = {
  type: 'increase' | 'decrease';
  anchor: AnchorContract | null;
  helper?: string;
  trigger: any;
}

const StakingPopover: React.FC<StakingPopoverProps> = ({ trigger, type, helper, anchor }) => {
  const initialFocusRef = React.useRef<any>();

  const inputRef = React.useRef<any>();
  const [amount, setAmount] = useState('');

  const [isSubmiting, setIsSubmiting] = useBoolean(false);

  const { global } = useGlobalStore();
  const toast = useToast();

  const { data: balances } = useSWR(global.accountId ? `balances/${global.accountId}` : null);
  const octBalance = useMemo(() => DecimalUtil.fromString(balances?.['OCT']), [balances]);

  const amountInDecimal = useMemo(() => DecimalUtil.fromString(amount), [amount]);

  const onOpen = () => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  }

  const onSubmit = async () => {
    setIsSubmiting.on();

    const amountStr = DecimalUtil.toU64(amountInDecimal, OCT_TOKEN_DECIMALS).toString();

    try {
      if (type === 'increase') {
        await global.octToken?.ft_transfer_call(
            {
              receiver_id: anchor?.contractId || '',
              amount: amountStr,
              msg: '"IncreaseStake"'
            },
            COMPLEX_CALL_GAS,
            1,
          );
      } else {
        await anchor?.decrease_stake(
          {  amount: DecimalUtil.toU64(amountInDecimal, OCT_TOKEN_DECIMALS).toString() },
          COMPLEX_CALL_GAS
        );
      }
     
    } catch(err: any) {

      if (err.message === FAILED_TO_REDIRECT_MESSAGE) {
        return;
      }

      toast({
        position: 'top-right',
        title: 'Error',
        description: err.toString(),
        status: 'error'
      });

    }

    setIsSubmiting.off();
  }

  return (
    <Popover placement="bottom" initialFocusRef={initialFocusRef} onOpen={onOpen}>
      <PopoverTrigger>
        {trigger}
      </PopoverTrigger>
      <PopoverContent w="360px">
        <PopoverBody p={4}>
          <Heading fontSize="md">{type === 'increase' ? 'Increase Stake' : 'Decrease Stake'}</Heading>
          {
            helper ? <Text variant="gray" mt={3}>{helper}</Text> : null
          }
          <Box mt={3}>
            <AmountInput placeholder="Amount of OCT" refObj={inputRef} onChange={v => setAmount(v)} value={amount} />
          </Box>
          <Box mt={3}>
            <Button 
              colorScheme="octo-blue" 
              isDisabled={
                isSubmiting ||
                amountInDecimal.lte(ZERO_DECIMAL) ||
                amountInDecimal.gt(octBalance)
              } 
              onClick={onSubmit}
              isLoading={isSubmiting}
              isFullWidth>
              {
                amountInDecimal.lte(ZERO_DECIMAL) ?
                'Input Amount' :
                amountInDecimal.gt(octBalance) ?
                'Insufficient Balance' :
                type === 'increase' ? 'Increase' : 'Decrease'
              }
            </Button>
          </Box>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

export const MyStaking: React.FC<MyStakingProps> = ({ appchain, anchor }) => {
  
  const bg = useColorModeValue(
    'linear-gradient(137deg,#1486ff 4%, #0c4df5)', 
    'linear-gradient(137deg,#1486ff 4%, #0c4df5)'
  );

  const whiteBg = useColorModeValue('white', '#15172c');

  const [registerValidatorModalOpen, setRegisterValidatorModalOpen] = useBoolean(false);

  const { global } = useGlobalStore();
  const [deposit, setDeposit] = useState(ZERO_DECIMAL);

  const { data: validators, error } = useSWR<Validator[]>(appchain  ? `validators/${appchain?.appchain_id}` : null);

  const isInValidatorList = useMemo(() => validators?.some(v => v.validator_id === global.accountId) || false, [validators, global]);

  useEffect(() => {
    if (!anchor || !global.accountId) {
      return;
    }

    anchor?.get_validator_deposit_of({
      validator_id: global.accountId
    }).then(deposit => {
      setDeposit(DecimalUtil.fromString(deposit, OCT_TOKEN_DECIMALS));
    });

  }, [global, anchor]);

  return (
    <>
      <Box bg={isInValidatorList ? bg : whiteBg} position="relative" p={6} pt={4} pb={6} borderRadius="lg">
        {
          isInValidatorList ?
          <>
            <Image position="absolute" bottom="0" right="0" h="110%" src={myStakingBg} zIndex={0} />
            <Box position="relative" zIndex={1}>
              <Flex justifyContent="space-between" alignItems="center">
                <Heading fontSize="lg" color="white">My Staking</Heading>
                <HStack spacing={0}>
                  <Button size="sm" variant="whiteAlphaGhost">History</Button>
                  <Button size="sm" variant="whiteAlphaGhost">
                    <Icon as={BsThreeDots} boxSize={5} />
                  </Button>
                </HStack>
              </Flex>
              <VStack p={6} spacing={1}>
                <Heading fontSize="3xl" color="white">{DecimalUtil.beautify(deposit)}</Heading>
                <Text color="whiteAlpha.800">You Staked (OCT)</Text>
              </VStack>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <StakingPopover 
                  trigger={
                    <Button variant="whiteAlpha"><Icon as={AddIcon} mr={2} boxSize={3} /> Decrease</Button>
                  } 
                  type="decrease"
                  anchor={anchor}
                  helper="Your decreased stakes will be claimable after 28 days" />

                <StakingPopover 
                  trigger={
                    <Button variant="white"><Icon as={MinusIcon} mr={2} boxSize={3} />Increase</Button>
                  } 
                  type="increase"
                  anchor={anchor} />
                
              </SimpleGrid>
            </Box>
          </> :
          <Box>
            <Flex justifyContent="space-between" alignItems="center">
              <Heading fontSize="lg">My Staking</Heading>
            </Flex>
            <Center minH="125px">
              <Box boxSize={20}>
                <Image src={empty} w="100%" />
              </Box>
            </Center>
            <Button 
              onClick={setRegisterValidatorModalOpen.on}
              colorScheme="octo-blue" 
              isLoading={!validators && !error} 
              isDisabled={!validators && !error} 
              isFullWidth>
              Register Validator
            </Button>
          </Box>
        }
      </Box>
      <RegisterValidatorModal 
        isOpen={registerValidatorModalOpen} 
        onClose={setRegisterValidatorModalOpen.off}
        anchor={anchor}
        appchain={appchain} />
    </>
  );
}