import React, { useState, useEffect } from 'react';
import { Button, Input, Form, Spin, List, Typography, Card, Layout } from 'antd';
import { useQuery } from "@tanstack/react-query";
import UserBadge from '../components/UserBadge';
import { useMediaQuery } from 'react-responsive';
const { Title } = Typography;
const { Sider, Content } = Layout;

interface Contact {
    UID: number;
    Username: string;
}

interface Message {
    IsSender: boolean;
    Message: string;
    CreatedAt: string;
}

interface MessageProps {
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean | undefined>>;
}

const Message: React.FC<MessageProps> = ({ setIsModalOpen }) => {
    const [Messages, setMessages] = useState<Record<number, Message[]>>({});
    const [currentContactUID, setCurrentContactUID] = useState<number | null>(null);
    const [newMessage, setNewMessage] = useState<string>('');
    const token = localStorage.getItem('token');
    const isMobile = useMediaQuery({ maxWidth: 767 });

    // 如果沒有 token，開啟 Modal
    useEffect(() => {
        if (token == null) {
            setIsModalOpen(true);
        }
    }, [token]);

    const { data: Contact, isLoading } = useQuery({
        queryKey: [`GetContacts`],
        queryFn: () =>
            fetch(`/api/Message/GetContacts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            }).then((res) => {
                if (!res.ok) {
                    return null;
                }
                return res.json();
            }),
    });

    useEffect(() => {
        if (!Contact || Contact.length === 0) return;

        Contact.forEach((contact: Contact) => {
            fetch(`/api/Message/GetMessages/?contactUID=${contact.UID}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    setMessages(prevMessages => ({
                        ...prevMessages,
                        [contact.UID]: data,
                    }));
                })
                .catch(error => {
                    console.error(`Error fetching messages for contact ${contact.UID}:`, error);
                });
        });
    }, [Contact]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) {
            return;
        }

        const messageData = {
            ReceiverID: currentContactUID,
            Message: newMessage,
        };

        fetch('/api/Message/SendMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(messageData),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to send message');
                }
                return response.json();
            })
            .then(() => {
                const newMessageData: Message = {
                    IsSender: true,
                    Message: newMessage,
                    CreatedAt: new Date().toISOString(),
                };

                setMessages(prevMessages => ({
                    ...prevMessages,
                    [currentContactUID!]: [
                        ...(prevMessages[currentContactUID!] || []),
                        newMessageData,
                    ],
                }));

                setNewMessage('');
            })
            .catch(error => {
                console.error('Error sending message:', error);
            });
    };

    if (isLoading) {
        return <Spin size="large" />;
    }

    return (
        <Card title="訊息頁面" className="mt-2">
            <Layout>
                {/* 左側聯絡人列表 */}
                {!isMobile && (
                    <Sider style={{ backgroundColor: 'var(--product-background-color)' }}>
                        <Title level={3}>聯絡人列表</Title>
                        <List
                            itemLayout="horizontal"
                            dataSource={Contact}
                            renderItem={(contact: Contact) => (
                                <List.Item
                                    key={contact.UID}
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: currentContactUID === contact.UID ? '#e6f7ff' : '#fff',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        borderBottom: '1px solid #ddd',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                        transition: 'background-color 0.3s ease',
                                        marginBottom: '0',
                                    }}
                                    onClick={() => setCurrentContactUID(contact.UID)}
                                >
                                    <List.Item.Meta
                                        title={<span style={{ color: '#333' }}><UserBadge username={contact.Username} /></span>}
                                    />
                                </List.Item>
                            )}
                        />
                    </Sider>)}

                <Layout>
                    {isMobile && (
                        <div style={{ display: 'flex', overflowX: 'auto', padding: '10px 0' }}>
                            {Contact?.map((contact: Contact) => (
                                <div
                                    key={contact.UID}
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: currentContactUID === contact.UID ? '#e6f7ff' : '#fff',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                                        transition: 'background-color 0.3s ease',
                                        marginRight: '10px',
                                        minWidth: '150px',
                                        textAlign: 'center',
                                        userSelect: 'none',
                                    }}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', contact.UID.toString());
                                    }}
                                    onClick={() => setCurrentContactUID(contact.UID)}
                                >
                                    <span style={{ color: '#333' }}><UserBadge username={contact.Username} /></span>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* 右側訊息區域 */}
                    <Content>
                        {currentContactUID !== null && Messages[currentContactUID] ? (
                            <div>
                                <Title level={3}>
                                    與用戶
                                    {Contact?.find((contact: Contact) => contact.UID === currentContactUID)?.Username || 'Unknown User'}
                                    的對話
                                </Title>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                                        {Messages[currentContactUID!]?.map((message, index) => (
                                            <li
                                                key={index}
                                                style={{
                                                    textAlign: message.IsSender ? 'right' : 'left',
                                                    marginBottom: '10px',
                                                }}
                                            >
                                                {/* 顯示發送者名稱，且排除自己發送的訊息 */}
                                                {!message.IsSender && (
                                                    <div>
                                                        <UserBadge username=
                                                            {Contact?.find((contact: Contact) => contact.UID === currentContactUID)?.Username || 'Unknown User'}
                                                        />
                                                    </div>
                                                )}
                                                {/* 訊息顯示框 */}
                                                <div
                                                    style={{
                                                        display: 'inline-block',
                                                        backgroundColor: '#f1f1f1',
                                                        padding: '10px',
                                                        borderRadius: '5px',
                                                        maxWidth: '60%',
                                                        margin: '5px',
                                                        border: '1px solid #ddd',
                                                    }}
                                                >
                                                    <span style={{ color: '#333' }}>{message.Message}</span>
                                                </div>
                                                <div>
                                                    <em>{new Date(message.CreatedAt).toLocaleString()}</em>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* 輸入框 */}
                                <Form.Item label="新訊息">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onPressEnter={handleSendMessage}
                                        placeholder="輸入訊息..."
                                    />
                                </Form.Item>
                                <Button type="primary" onClick={handleSendMessage}>
                                    發送訊息
                                </Button>
                            </div>
                        ) : (
                            <div style={{ padding: '20px' }}>
                                {Object.keys(Messages).length === 0 ? (
                                    <Title level={3}>尚無聯絡人</Title>
                                ) : (
                                    <Title level={3}>請選擇一個聯絡人查看訊息</Title>
                                )}
                            </div>
                        )}
                    </Content>
                </Layout>
            </Layout>
        </Card>

    );
};

export default Message;
